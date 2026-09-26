#!/usr/bin/env python3
"""Convert an AWARD YML feed to JSON and refresh product slider cards."""

from __future__ import annotations

import argparse
import html
import json
import re
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from generate_product_pages import generate_site_pages, product_path


PANEL_GROUPS = {
    "AW-catalog-panel-cats": ("cats", None, None),
    "AW-catalog-panel-dogs": ("dogs", None, None),
    "AW-hits-panel-dry": ("cats", "dry", 5),
    "AW-hits-panel-wet": ("cats", "wet", 5),
    "AW-hits-dogs-panel-dry": ("dogs", "dry", 5),
    "AW-hits-dogs-panel-wet": ("dogs", "wet", 5),
}


def clean_text(value: str | None) -> str:
    current = (value or "").strip()

    for _ in range(3):
        decoded = html.unescape(current)
        if decoded == current:
            break
        current = decoded

    return re.sub(r"\s+", " ", current)


def parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    return value.strip().lower() == "true"


def get_animal(offer: ET.Element, name: str) -> str:
    animal = " ".join(
        clean_text(param.text).lower()
        for param in offer.findall('param[@name="Животное"]')
    )
    category_id = clean_text(offer.findtext("categoryId"))
    normalized_name = name.lower()

    if "кош" in animal or category_id == "16" or "кош" in normalized_name:
        return "cats"
    if "собак" in animal or category_id == "12" or "собак" in normalized_name:
        return "dogs"

    raise ValueError(f"Cannot determine animal for offer {offer.attrib.get('id')}")


def get_food_type(offer: ET.Element) -> str:
    value = clean_text(offer.findtext('param[@name="Тип корма"]')).lower()

    if value == "сухой":
        return "dry"
    if value == "влажный":
        return "wet"

    raise ValueError(f"Cannot determine food type for offer {offer.attrib.get('id')}")


def format_weight(value: str) -> str:
    weight = Decimal(value)

    if weight < 1:
        return f"{int(weight * 1000)} г"

    formatted = format(weight.normalize(), "f").replace(".", ",")
    return f"{formatted} кг"


def discount_percent(price: str, old_price: str | None) -> int | None:
    if not old_price:
        return None

    current = Decimal(price)
    old = Decimal(old_price)
    if old <= current or old == 0:
        return None

    return int(((old - current) / old * 100).quantize(Decimal("1"), ROUND_HALF_UP))


def format_price(value: str) -> str:
    price = Decimal(value).quantize(Decimal("0.01"))
    rendered = f"{price:,.2f}".replace(",", " ").replace(".", ",")
    if rendered.endswith(",00"):
        rendered = rendered[:-3]
    return f"{rendered} р."


def parse_offer(offer: ET.Element) -> dict[str, object]:
    name = clean_text(offer.findtext("name"))
    price = clean_text(offer.findtext("price"))
    old_price = clean_text(offer.findtext("oldprice")) or None
    feed_weight = clean_text(offer.findtext("weight"))
    category_id = clean_text(offer.findtext("categoryId")) or None
    parameters = [
        {"name": clean_text(param.attrib.get("name")), "value": clean_text(param.text)}
        for param in offer.findall("param")
    ]

    return {
        "id": offer.attrib["id"],
        "available": True,
        "vendorCode": clean_text(offer.findtext("vendorCode")) or None,
        "barcodes": [clean_text(node.text) for node in offer.findall("barcode")],
        "url": clean_text(offer.findtext("url")),
        "price": price,
        "oldPrice": old_price,
        "currencyId": clean_text(offer.findtext("currencyId")),
        "categoryId": category_id,
        "pictures": [clean_text(node.text) for node in offer.findall("picture")],
        "delivery": parse_bool(offer.findtext("delivery")),
        "feedWeightKg": feed_weight,
        "salesNotes": clean_text(offer.findtext("sales_notes")) or None,
        "enableAutoDiscounts": parse_bool(offer.findtext("enable_auto_discounts")),
        "vendor": clean_text(offer.findtext("vendor")),
        "name": name,
        "description": clean_text(offer.findtext("description")),
        "parameters": parameters,
        "animal": get_animal(offer, name),
        "foodType": get_food_type(offer),
        "displayWeight": format_weight(feed_weight),
        "discountPercent": discount_percent(price, old_price),
    }


def build_catalog(root: ET.Element) -> dict[str, object]:
    shop = root.find("shop")
    if shop is None:
        raise ValueError("The YML feed does not contain a shop element")

    categories = [
        {
            "id": category.attrib["id"],
            "parentId": category.attrib.get("parentId"),
            "name": clean_text(category.text),
        }
        for category in shop.findall("./categories/category")
    ]
    products = [
        parse_offer(offer)
        for offer in shop.findall("./offers/offer")
        if offer.attrib.get("available") == "true"
    ]

    return {
        "source": {
            "catalogDate": root.attrib.get("date"),
            "shopName": clean_text(shop.findtext("name")),
            "company": clean_text(shop.findtext("company")),
            "platform": clean_text(shop.findtext("platform")),
            "url": clean_text(shop.findtext("url")),
        },
        "currencies": [dict(currency.attrib) for currency in shop.findall("./currencies/currency")],
        "categories": categories,
        "deliveryOptions": [
            dict(option.attrib) for option in shop.findall("./delivery-options/option")
        ],
        "products": products,
    }


def render_card(product: dict[str, object], indent: str) -> str:
    name = html.escape(str(product["name"]))
    animal = html.escape(str(product["animal"]), quote=True)
    image = html.escape(str(product["pictures"][0]), quote=True)
    url = html.escape(product_path(product), quote=True)
    current_price = format_price(str(product["price"]))
    old_price = product["oldPrice"]
    discount = product["discountPercent"]
    lines = [
        f'<article class="AW-catalog-product AW-catalog-product--{animal}" data-js-catalog-product>',
        '  <div class="AW-catalog-product__media">',
        '    <img',
        '      class="AW-catalog-product__image"',
        f'      src="{image}"',
        '      width="800"',
        '      height="800"',
        f'      alt="{html.escape(str(product["name"]), quote=True)}"',
        '      loading="lazy"',
        '      decoding="async"',
        '    />',
        '  </div>',
        '  <div class="AW-catalog-product__price-row">',
        '    <div class="AW-catalog-product__price">',
        f'      <span class="AW-catalog-product__current">{current_price}</span>',
    ]

    if old_price:
        lines.append(
            f'      <span class="AW-catalog-product__old">{format_price(str(old_price))}</span>'
        )

    lines.extend(['    </div>'])

    if discount is not None:
        lines.append(
            f'    <span class="AW-catalog-product__discount">-{discount}%</span>'
        )

    lines.extend(
        [
            '  </div>',
            f'  <p class="AW-catalog-product__weight">{product["displayWeight"]}</p>',
            '  <h3 class="AW-catalog-product__name">',
            f'    {name}',
            '  </h3>',
            '  <button',
            '    class="AW-btn AW-catalog-product__button AW-catalog-product__button--primary"',
            '    type="button"',
            '    data-js-catalog-buy-primary',
            '  >',
            '    Купить в 1 клик',
            '  </button>',
        '  <a',
        '    class="AW-btn AW-catalog-product__button AW-catalog-product__button--secondary"',
        f'    href="{url}"',
        '    data-js-product-open',
            '  >',
            '    Подробнее',
            '  </a>',
            '</article>',
        ]
    )

    return "\n".join(f"{indent}{line}" for line in lines)


def replace_panel_contents(document: str, panel_id: str, cards: str) -> str:
    id_match = re.search(rf'\bid="{re.escape(panel_id)}"', document)
    if not id_match:
        raise ValueError(f"Panel {panel_id} was not found in index.html")

    open_start = document.rfind("<div", 0, id_match.start())
    open_end = document.find(">", id_match.end()) + 1
    if open_start < 0 or open_end <= 0:
        raise ValueError(f"Opening div for {panel_id} was not found")

    depth = 1
    close_start = -1
    for token in re.finditer(r"<div\b|</div\s*>", document[open_end:], re.IGNORECASE):
        if token.group(0).lower().startswith("</div"):
            depth -= 1
        else:
            depth += 1

        if depth == 0:
            close_start = open_end + token.start()
            break

    if close_start < 0:
        raise ValueError(f"Closing div for {panel_id} was not found")

    return f"{document[:open_end]}\n{cards}\n{document[close_start:]}"


def update_index(index_path: Path, products: list[dict[str, object]]) -> None:
    document = index_path.read_text(encoding="utf-8")

    for panel_id, (animal, food_type, limit) in PANEL_GROUPS.items():
        selected = [
            product
            for product in products
            if product["animal"] == animal
            and (food_type is None or product["foodType"] == food_type)
        ]
        if limit is not None:
            selected = selected[:limit]

        id_position = document.index(f'id="{panel_id}"')
        panel_open = document.rfind("<div", 0, id_position)
        line_start = document.rfind("\n", 0, panel_open) + 1
        line_end = document.find("\n", line_start)
        panel_line = document[line_start:line_end]
        panel_indent = panel_line[: len(panel_line) - len(panel_line.lstrip())]
        card_indent = f"{panel_indent}  "
        cards = "\n\n".join(render_card(product, card_indent) for product in selected)
        document = replace_panel_contents(document, panel_id, cards)

    index_path.write_text(document, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("feed", type=Path)
    parser.add_argument("--json", type=Path, required=True)
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument(
        "--products-dir", type=Path, default=Path("catalog/product")
    )
    parser.add_argument(
        "--catalog-index", type=Path, default=Path("catalog/index.html")
    )
    args = parser.parse_args()

    root = ET.parse(args.feed).getroot()
    catalog = build_catalog(root)
    args.json.parent.mkdir(parents=True, exist_ok=True)
    args.json.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    update_index(args.index, catalog["products"])
    generate_site_pages(
        index_path=args.index,
        catalog=catalog,
        products_dir=args.products_dir,
        catalog_index=args.catalog_index,
        update_index=False,
    )


if __name__ == "__main__":
    main()
