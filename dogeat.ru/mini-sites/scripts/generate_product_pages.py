#!/usr/bin/env python3
"""Generate the AWARD catalog route and static product detail pages."""

from __future__ import annotations

import argparse
import html
import json
import re
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse


def product_slug(product: dict[str, object]) -> str:
    source_path = urlparse(str(product["url"])).path
    source_slug = Path(source_path).stem.lower()
    safe_slug = re.sub(r"[^a-z0-9-]+", "-", source_slug).strip("-")
    return f'{product["id"]}-{safe_slug}'


def product_path(product: dict[str, object]) -> str:
    return f"catalog/product/{product_slug(product)}/"


def format_price(value: str) -> str:
    price = Decimal(value).quantize(Decimal("0.01"))
    rendered = f"{price:,.2f}".replace(",", " ").replace(".", ",")
    if rendered.endswith(",00"):
        rendered = rendered[:-3]
    return f"{rendered} р."


def get_parameter(product: dict[str, object], name: str) -> str:
    for parameter in product.get("parameters", []):
        if parameter["name"] == name:
            return str(parameter["value"])
    return ""


def get_parameters(product: dict[str, object], name: str) -> list[str]:
    return [
        str(parameter["value"]).strip()
        for parameter in product.get("parameters", [])
        if parameter["name"] == name and str(parameter["value"]).strip()
    ]


CATALOG_FILTERS = (
    ("animal", "Животное"),
    ("food_type", "Тип корма"),
    ("age", "Возраст"),
    ("taste", "Вкус"),
    ("size", "Размер"),
    ("purpose", "Назначение"),
    ("indications", "Показания"),
    ("packaging", "Упаковка"),
    ("features", "Особенности состава"),
    ("line", "Линейка"),
    ("country", "Страна производитель"),
)


CATALOG_PARAMETER_NAMES = {
    "age": "Возраст",
    "taste": "Вкус",
    "size": "Размер",
    "purpose": "Назначение",
    "indications": "Показания",
    "packaging": "Упаковка",
    "features": "Особенности состава",
}


def unique_values(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def product_filter_values(product: dict[str, object], key: str) -> list[str]:
    if key == "animal":
        return [{"cats": "Для кошек", "dogs": "Для собак"}[str(product["animal"])]]
    if key == "food_type":
        return [{"dry": "Сухой", "wet": "Влажный"}[str(product["foodType"])]]
    if key == "line":
        name = str(product["name"]).lower()
        return ["Special Care" if "special care" in name else "Основная линейка"]
    if key == "country":
        values = get_parameters(product, "Страна производитель")
        return ["Россия" if "росси" in value.lower() else value for value in values]

    parameter_name = CATALOG_PARAMETER_NAMES.get(key)
    return unique_values(get_parameters(product, parameter_name)) if parameter_name else []


def catalog_filter_groups(products: list[dict[str, object]]) -> list[dict[str, object]]:
    groups = []

    for key, label in CATALOG_FILTERS:
        options = sorted(
            {
                value
                for product in products
                for value in product_filter_values(product, key)
            },
            key=str.casefold,
        )

        if len(options) > 1:
            groups.append({"key": key, "label": label, "options": options})

    return groups


def display_parameter_value(value: object) -> str:
    normalized = str(value).strip().lower()
    if normalized == "true":
        return "Да"
    if normalized == "false":
        return "Нет"
    return str(value)


def product_description(product: dict[str, object]) -> str:
    details = []
    for parameter_name in (
        "Животное",
        "Возраст",
        "Вкус",
        "Тип корма",
        "Класс",
        "Назначение",
    ):
        value = get_parameter(product, parameter_name)
        if value:
            details.append(f"{parameter_name}: {value}")

    name = str(product["name"]).rstrip(". ")
    return f"{name}. {'; '.join(details)}." if details else f"{name}."


def shorten_text(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    shortened = value[: limit - 1].rsplit(" ", 1)[0].rstrip(" ,.-")
    return f"{shortened}…"


def extract_element(document: str, needle: str, tag: str) -> str:
    needle_position = document.index(needle)
    open_start = document.rfind(f"<{tag}", 0, needle_position + 1)
    open_end = document.find(">", needle_position) + 1
    if open_start < 0 or open_end <= 0:
        raise ValueError(f"Cannot find opening <{tag}> for {needle}")

    depth = 1
    token_pattern = re.compile(rf"<{tag}\b|</{tag}\s*>", re.IGNORECASE)
    for token in token_pattern.finditer(document, open_end):
        if token.group(0).lower().startswith(f"</{tag}"):
            depth -= 1
        else:
            depth += 1

        if depth == 0:
            return document[open_start : token.end()]

    raise ValueError(f"Cannot find closing </{tag}> for {needle}")


def page_head(
    *,
    title: str,
    description: str,
    canonical: str,
    image: str | None = None,
    product_price: str | None = None,
    og_type: str = "website",
) -> str:
    escaped_title = html.escape(title, quote=True)
    escaped_description = html.escape(description, quote=True)
    escaped_canonical = html.escape(canonical, quote=True)
    social_meta = ""

    if image:
        escaped_image = html.escape(image, quote=True)
        social_meta += f'\n    <meta property="og:image" content="{escaped_image}" />'

    if product_price:
        social_meta += (
            f'\n    <meta property="product:price:amount" content="{product_price}" />'
            '\n    <meta property="product:price:currency" content="RUB" />'
        )

    return f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="/mini-sites/" />
    <title>{escaped_title}</title>
    <meta name="description" content="{escaped_description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{escaped_canonical}" />
    <meta property="og:type" content="{html.escape(og_type, quote=True)}" />
    <meta property="og:title" content="{escaped_title}" />
    <meta property="og:description" content="{escaped_description}" />
    <meta property="og:url" content="{escaped_canonical}" />{social_meta}
    <link rel="icon" type="image/png" href="img/favicon/favicon-96x96.png" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="img/favicon/favicon.svg" />
    <link rel="shortcut icon" href="img/favicon/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="img/favicon/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-title" content="Award" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="manifest" href="img/favicon/site.webmanifest" />
    <link rel="stylesheet" href="css/style.min.css" />
    <script src="js/main.js" defer></script>
  </head>"""


def render_product(product: dict[str, object]) -> str:
    product_id = str(product["id"])
    animal = html.escape(str(product["animal"]), quote=True)
    name = html.escape(str(product["name"]))
    name_attr = html.escape(str(product["name"]), quote=True)
    description = html.escape(product_description(product))
    image = html.escape(str(product["pictures"][0]), quote=True)
    brand = html.escape(get_parameter(product, "Бренд") or str(product["vendor"]))
    sku_value = str(product.get("vendorCode") or product_id)
    sku = html.escape(sku_value)
    weight = html.escape(str(product["displayWeight"]))
    current_price = html.escape(format_price(str(product["price"])))
    old_price = product.get("oldPrice")
    discount = product.get("discountPercent")
    page_url = product_path(product)
    description_id = f"AW-product-description-{product_id}"
    specs_id = f"AW-product-specs-{product_id}"
    description_tab_id = f"AW-product-description-tab-{product_id}"
    specs_tab_id = f"AW-product-specs-tab-{product_id}"

    old_price_markup = ""
    if old_price:
        old_price_markup = (
            f'<span class="AW-product__old">{html.escape(format_price(str(old_price)))}</span>'
        )

    discount_markup = ""
    if discount is not None:
        discount_markup = f'<span class="AW-product__discount">-{discount}%</span>'

    specs = "\n".join(
        f"""                <div class="AW-product__spec">
                  <dt>{html.escape(str(parameter['name']))}</dt>
                  <dd>{html.escape(display_parameter_value(parameter['value']))}</dd>
                </div>"""
        for parameter in product.get("parameters", [])
    )

    return f"""<article
        class="AW-product AW-product--{animal}"
        data-js-product-detail
        data-product-url="{page_url}"
      >
        <div class="AW-product__toolbar">
          <a class="AW-btn AW-product__back" href="catalog/" data-js-product-close>
            Назад в каталог
          </a>
          <a
            class="AW-btn AW-product__close"
            href="catalog/"
            aria-label="Закрыть карточку и вернуться в каталог"
            data-js-product-close
          ></a>
        </div>

        <div class="AW-product__container">
          <div class="AW-product__overview">
            <div class="AW-product__media">
              <img
                class="AW-product__image"
                src="{image}"
                width="800"
                height="800"
                alt="{name_attr}"
                decoding="async"
                fetchpriority="high"
              />
            </div>

            <div class="AW-product__info">
              <h1 class="AW-product__title">{name}</h1>
              <div class="AW-product__meta">
                <p class="AW-product__brand">{brand}</p>
                <p class="AW-product__sku">Артикул: {sku}</p>
                <p class="AW-product__weight">Вес: {weight}</p>
              </div>

              <div class="AW-product__purchase">
                <div class="AW-product__price-row">
                  <span class="AW-product__current">{current_price}</span>
                  {old_price_markup}
                  {discount_markup}
                </div>

                <div class="AW-product__actions">
                  <div class="AW-product__counter" aria-label="Количество товара">
                    <button
                      class="AW-btn AW-product__counter-button"
                      type="button"
                      aria-label="Уменьшить количество"
                      data-js-product-minus
                    >
                      &minus;
                    </button>
                    <span class="AW-product__quantity" data-js-product-quantity>1</span>
                    <button
                      class="AW-btn AW-product__counter-button"
                      type="button"
                      aria-label="Увеличить количество"
                      data-js-product-plus
                    >
                      +
                    </button>
                  </div>
                  <button
                    class="AW-btn AW-product__buy"
                    type="button"
                    data-js-product-buy
                  >
                    В корзину
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="AW-product__details">
            <div class="AW-product__tabs" role="tablist" aria-label="Информация о товаре">
              <button
                class="AW-btn AW-product__tab"
                id="{description_tab_id}"
                type="button"
                role="tab"
                aria-selected="true"
                aria-controls="{description_id}"
                data-js-product-tab
              >
                Описание
              </button>
              <button
                class="AW-btn AW-product__tab"
                id="{specs_tab_id}"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="{specs_id}"
                tabindex="-1"
                data-js-product-tab
              >
                Характеристики
              </button>
            </div>

            <section
              class="AW-product__panel"
              id="{description_id}"
              role="tabpanel"
              aria-labelledby="{description_tab_id}"
              data-js-product-panel
            >
              <p class="AW-product__description">{description}</p>
            </section>

            <section
              class="AW-product__panel"
              id="{specs_id}"
              role="tabpanel"
              aria-labelledby="{specs_tab_id}"
              data-js-product-panel
              hidden
            >
              <dl class="AW-product__specs">
{specs}
              </dl>
            </section>
          </div>
        </div>
      </article>"""


def render_structured_data(product: dict[str, object]) -> str:
    page_url = product_path(product)
    structured_data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product["name"],
        "image": product["pictures"],
        "description": product_description(product),
        "sku": product.get("vendorCode") or product["id"],
        "brand": {
            "@type": "Brand",
            "name": get_parameter(product, "Бренд") or product["vendor"],
        },
        "url": page_url,
        "offers": {
            "@type": "Offer",
            "url": page_url,
            "priceCurrency": "RUB",
            "price": product["price"],
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/NewCondition",
        },
    }
    payload = json.dumps(structured_data, ensure_ascii=False).replace("</", "<\\/")
    return f'    <script type="application/ld+json">{payload}</script>'


def shared_fragments(document: str) -> dict[str, str]:
    return {
        "header": extract_element(document, 'class="AW-header"', "header"),
        "footer": extract_element(document, 'class="AW-footer"', "footer"),
        "mini_cart": extract_element(document, "data-js-mini-cart", "button"),
        "order": extract_element(document, "data-js-order-modal", "div"),
        "cart_live": extract_element(document, "data-js-cart-live", "span"),
    }


def render_product_page(
    product: dict[str, object], fragments: dict[str, str]
) -> str:
    name = str(product["name"])
    description = product_description(product)
    image = str(product["pictures"][0])
    seo_title = f"{shorten_text(name, 82)} — AWARD"
    head = page_head(
        title=seo_title,
        description=shorten_text(description, 160),
        canonical=product_path(product),
        image=image,
        product_price=str(product["price"]),
        og_type="product",
    )
    structured_data = render_structured_data(product)
    head = head.replace("  </head>", f"{structured_data}\n  </head>")
    product_markup = render_product(product)

    return f"""{head}
  <body>
    <div class="AW">
      <main class="AW-product-page">
{product_markup}
      </main>
{fragments['mini_cart']}
{fragments['order']}
{fragments['cart_live']}
    </div>
  </body>
</html>
"""


def render_catalog_filter(group: dict[str, object], index: int) -> str:
    key = str(group["key"])
    label = html.escape(str(group["label"]))
    options = []

    for option_index, option in enumerate(group["options"]):
        option_text = html.escape(str(option))
        option_value = html.escape(str(option), quote=True)
        option_id = f"AW-catalog-filter-{key}-{option_index}"
        options.append(
            f"""                    <label class="AW-catalog-page__option" for="{option_id}">
                      <input
                        id="{option_id}"
                        type="checkbox"
                        name="{key}"
                        value="{option_value}"
                        data-js-catalog-option
                      />
                      <span class="AW-catalog-page__option-check" aria-hidden="true"></span>
                      <span>{option_text}</span>
                    </label>"""
        )

    options_markup = "\n".join(options)
    panel_id = f"AW-catalog-filter-panel-{index}"
    return f"""              <div class="AW-catalog-page__filter" data-js-catalog-filter>
                <button
                  class="AW-btn AW-catalog-page__filter-toggle"
                  type="button"
                  aria-expanded="false"
                  aria-controls="{panel_id}"
                  data-js-catalog-filter-toggle
                >
                  <span>{label}</span>
                  <span class="AW-catalog-page__filter-count" data-js-catalog-filter-count hidden></span>
                  <span class="AW-catalog-page__chevron" aria-hidden="true"></span>
                </button>
                <div
                  class="AW-catalog-page__dropdown"
                  id="{panel_id}"
                  data-js-catalog-filter-panel
                  hidden
                >
{options_markup}
                </div>
              </div>"""


def render_catalog_price_filter(products: list[dict[str, object]]) -> str:
    prices = [Decimal(str(product["price"])) for product in products]
    min_price = int(min(prices))
    max_price = int(max(prices).to_integral_value(rounding="ROUND_CEILING"))

    return f"""              <div class="AW-catalog-page__filter" data-js-catalog-filter>
                <button
                  class="AW-btn AW-catalog-page__filter-toggle"
                  type="button"
                  aria-expanded="false"
                  aria-controls="AW-catalog-price-panel"
                  data-js-catalog-filter-toggle
                >
                  <span>Цена</span>
                  <span class="AW-catalog-page__filter-count" data-js-catalog-filter-count hidden></span>
                  <span class="AW-catalog-page__chevron" aria-hidden="true"></span>
                </button>
                <div
                  class="AW-catalog-page__dropdown AW-catalog-page__dropdown--price"
                  id="AW-catalog-price-panel"
                  data-js-catalog-filter-panel
                  hidden
                >
                  <label class="AW-catalog-page__price-field">
                    <span>От</span>
                    <input
                      type="number"
                      min="{min_price}"
                      max="{max_price}"
                      inputmode="numeric"
                      placeholder="{min_price}"
                      data-js-catalog-price-min
                    />
                  </label>
                  <span class="AW-catalog-page__price-separator" aria-hidden="true">—</span>
                  <label class="AW-catalog-page__price-field">
                    <span>До</span>
                    <input
                      type="number"
                      min="{min_price}"
                      max="{max_price}"
                      inputmode="numeric"
                      placeholder="{max_price}"
                      data-js-catalog-price-max
                    />
                  </label>
                  <button
                    class="AW-btn AW-catalog-page__price-apply"
                    type="button"
                    data-js-catalog-price-apply
                  >
                    Применить
                  </button>
                </div>
              </div>"""


def render_catalog_card(product: dict[str, object], index: int) -> str:
    name = html.escape(str(product["name"]))
    animal = html.escape(str(product["animal"]), quote=True)
    name_attr = html.escape(str(product["name"]), quote=True)
    image = html.escape(str(product["pictures"][0]), quote=True)
    url = html.escape(product_path(product), quote=True)
    sku = html.escape(str(product.get("vendorCode") or product["id"]))
    current_price = html.escape(format_price(str(product["price"])))
    old_price = product.get("oldPrice")
    discount = product.get("discountPercent")
    filters = {
        key: product_filter_values(product, key)
        for key, _label in CATALOG_FILTERS
    }
    search_values = [
        str(product["name"]),
        str(product.get("vendorCode") or product["id"]),
        *(str(parameter["value"]) for parameter in product.get("parameters", [])),
    ]
    product_data = html.escape(
        json.dumps(
            {
                "id": str(product["id"]),
                "index": index,
                "name": str(product["name"]),
                "price": float(product["price"]),
                "search": " ".join(search_values).casefold(),
                "filters": filters,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        quote=True,
    )
    old_price_markup = ""
    discount_markup = ""
    loading_markup = 'loading="lazy"'

    if index == 0:
        loading_markup = 'fetchpriority="high"'
    if old_price:
        old_price_markup = (
            f'<span class="AW-catalog-product__old">'
            f'{html.escape(format_price(str(old_price)))}</span>'
        )
    if discount is not None:
        discount_markup = (
            f'<span class="AW-catalog-product__discount">-{discount}%</span>'
        )

    return f"""            <article
              class="AW-catalog-product AW-catalog-product--{animal} AW-catalog-page__product"
              data-js-catalog-product
              data-js-catalog-page-product
              data-catalog-product="{product_data}"
            >
              <div class="AW-catalog-product__media AW-catalog-page__media">
                <a
                  class="AW-catalog-page__image-link"
                  href="{url}"
                  aria-label="Открыть: {name_attr}"
                  data-js-product-open
                >
                  <img
                    class="AW-catalog-product__image AW-catalog-page__image"
                    src="{image}"
                    width="800"
                    height="800"
                    alt="{name_attr}"
                    {loading_markup}
                    decoding="async"
                  />
                </a>
              </div>

              <div class="AW-catalog-page__card-body">
                <div class="AW-catalog-product__price-row">
                  <div class="AW-catalog-product__price">
                    <span class="AW-catalog-product__current">{current_price}</span>
                    {old_price_markup}
                  </div>
                  {discount_markup}
                </div>
                <p class="AW-catalog-product__weight">{html.escape(str(product['displayWeight']))}</p>
                <h2 class="AW-catalog-product__name">{name}</h2>
                <p class="AW-catalog-page__sku">Артикул: {sku}</p>
              </div>

              <div class="AW-catalog-page__card-actions">
                <button
                  class="AW-btn AW-catalog-product__button AW-catalog-product__button--primary"
                  type="button"
                  data-js-catalog-page-buy-primary
                >
                  Купить в 1 клик
                </button>
                <a
                  class="AW-btn AW-catalog-product__button AW-catalog-product__button--secondary"
                  href="{url}"
                  data-js-product-open
                >
                  Подробнее
                </a>
              </div>
            </article>"""


def render_catalog(products: list[dict[str, object]]) -> str:
    groups = catalog_filter_groups(products)
    filters = [render_catalog_price_filter(products)]
    filters.extend(
        render_catalog_filter(group, index)
        for index, group in enumerate(groups, start=1)
    )
    cards = "\n".join(
        render_catalog_card(product, index) for index, product in enumerate(products)
    )
    filters_markup = "\n".join(filters)

    return f"""        <section class="AW-catalog-page" data-js-catalog-page>
          <div class="AW-container AW-catalog-page__container">
            <div class="AW-catalog-page__heading">
              <h1 class="AW-catalog-page__title">Каталог AWARD</h1>
            </div>

            <div class="AW-catalog-page__toolbar">
              <button
                class="AW-btn AW-catalog-page__filters-open"
                type="button"
                aria-expanded="false"
                aria-controls="AW-catalog-page-filters"
                data-js-catalog-filters-open
              >
                <span class="AW-catalog-page__filters-icon" aria-hidden="true"></span>
                <span>Фильтры</span>
                <span class="AW-catalog-page__filters-total" data-js-catalog-filters-total hidden></span>
              </button>

              <div
                class="AW-catalog-page__filters-shell"
                id="AW-catalog-page-filters"
                data-js-catalog-filters-shell
              >
                <button
                  class="AW-catalog-page__filters-backdrop"
                  type="button"
                  aria-label="Закрыть фильтры"
                  data-js-catalog-filters-close
                ></button>
                <div class="AW-catalog-page__filters-dialog" data-js-catalog-filters-dialog>
                  <div class="AW-catalog-page__filters-header">
                    <h2 id="AW-catalog-page-filters-title">Фильтры</h2>
                    <button
                      class="AW-btn AW-catalog-page__filters-close"
                      type="button"
                      aria-label="Закрыть фильтры"
                      data-js-catalog-filters-close
                    ></button>
                  </div>
                  <div class="AW-catalog-page__filters" data-js-catalog-filters>
{filters_markup}
                  </div>
                  <div class="AW-catalog-page__filters-footer">
                    <button
                      class="AW-btn AW-catalog-page__filters-reset"
                      type="button"
                      data-js-catalog-clear
                    >
                      Очистить
                    </button>
                    <button
                      class="AW-btn AW-catalog-page__filters-show"
                      type="button"
                      data-js-catalog-filters-close
                    >
                      Показать товары
                    </button>
                  </div>
                </div>
              </div>

              <label class="AW-catalog-page__search">
                <span class="AW-catalog-page__visually-hidden">Поиск по каталогу</span>
                <input
                  type="search"
                  placeholder="Поиск по названию или артикулу"
                  autocomplete="off"
                  data-js-catalog-search
                />
                <span class="AW-catalog-page__search-icon" aria-hidden="true"></span>
              </label>

              <label class="AW-catalog-page__sort">
                <span class="AW-catalog-page__visually-hidden">Сортировка товаров</span>
                <select data-js-catalog-sort>
                  <option value="default">По умолчанию</option>
                  <option value="price-asc">Сначала дешевле</option>
                  <option value="price-desc">Сначала дороже</option>
                  <option value="name">По названию</option>
                </select>
              </label>
            </div>

            <div class="AW-catalog-page__applied" data-js-catalog-applied hidden>
              <div class="AW-catalog-page__tags" data-js-catalog-tags></div>
              <button
                class="AW-btn AW-catalog-page__clear"
                type="button"
                data-js-catalog-clear
              >
                Очистить всё
              </button>
            </div>

            <p class="AW-catalog-page__result" aria-live="polite">
              Найдено: <strong data-js-catalog-result>{len(products)}</strong>
            </p>

            <div class="AW-catalog-page__grid" data-js-catalog-grid>
{cards}
            </div>

            <nav
              class="AW-catalog-page__pagination"
              aria-label="Страницы каталога"
              data-js-catalog-pagination
              hidden
            ></nav>

            <div class="AW-catalog-page__empty" data-js-catalog-empty hidden>
              <h2>Товары не найдены</h2>
              <p>Попробуйте изменить запрос или сбросить выбранные фильтры.</p>
              <button class="AW-btn AW-catalog-page__empty-reset" type="button" data-js-catalog-clear>
                Сбросить фильтры
              </button>
            </div>
          </div>
        </section>"""


def render_catalog_page(
    document: str,
    fragments: dict[str, str],
    products: list[dict[str, object]],
) -> str:
    catalog = render_catalog(products)
    product_overlay = extract_element(document, "data-js-product-overlay", "div")
    head = page_head(
        title="Каталог кормов AWARD для кошек и собак",
        description="Каталог суперпремиальных кормов AWARD для кошек и собак.",
        canonical="catalog/",
    )

    return f"""{head}
  <body>
    <div class="AW">
{fragments['header']}
      <main>
{catalog}
      </main>
{fragments['footer']}
{fragments['mini_cart']}
{fragments['order']}
{product_overlay}
{fragments['cart_live']}
    </div>
  </body>
</html>
"""


def update_catalog_links(
    document: str, products: list[dict[str, object]]
) -> str:
    updated = document
    for product in products:
        external_url = html.escape(str(product["url"]), quote=True)
        internal_url = product_path(product)
        old_link = f'href="{external_url}"'
        new_link = f'href="{internal_url}" data-js-product-open'
        updated = updated.replace(old_link, new_link)
    return updated


def generate_site_pages(
    *,
    index_path: Path,
    catalog: dict[str, object],
    products_dir: Path,
    catalog_index: Path,
    update_index: bool = True,
) -> None:
    document = index_path.read_text(encoding="utf-8")
    products = list(catalog["products"])

    if update_index:
        document = update_catalog_links(document, products)
        index_path.write_text(document, encoding="utf-8")

    fragments = shared_fragments(document)
    catalog_index.parent.mkdir(parents=True, exist_ok=True)
    catalog_index.write_text(
        render_catalog_page(document, fragments, products), encoding="utf-8"
    )

    products_dir.mkdir(parents=True, exist_ok=True)
    for product in products:
        output_directory = products_dir / product_slug(product)
        output_directory.mkdir(parents=True, exist_ok=True)
        (output_directory / "index.html").write_text(
            render_product_page(product, fragments), encoding="utf-8"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/products.json"))
    parser.add_argument("--index", type=Path, default=Path("index.html"))
    parser.add_argument(
        "--products-dir", type=Path, default=Path("catalog/product")
    )
    parser.add_argument(
        "--catalog-index", type=Path, default=Path("catalog/index.html")
    )
    parser.add_argument("--no-update-index", action="store_true")
    args = parser.parse_args()

    catalog = json.loads(args.data.read_text(encoding="utf-8"))
    generate_site_pages(
        index_path=args.index,
        catalog=catalog,
        products_dir=args.products_dir,
        catalog_index=args.catalog_index,
        update_index=not args.no_update_index,
    )


if __name__ == "__main__":
    main()
