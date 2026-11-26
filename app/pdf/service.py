from __future__ import annotations
from datetime import datetime
from pathlib import Path
from typing import Any

PDF_ROOT = Path(__file__).parent
APP_ROOT = PDF_ROOT.parent

CHAPTERS = [
    {
        "code": "performance",
        "number": "02",
        "title": "PERFORMANCE & CONTROL",
        "groups": {"ENGINES", "PROPULSION", "ELECTRICAL", "NAV_COMMON", "RAYMARINE", "GARMIN"},
        "image": "performance.jpg",
    },
    {
        "code": "lifestyle",
        "number": "03",
        "title": "DECK, COMFORT & EQUIPMENT",
        "groups": {"HULL_DECK", "DECK", "COCKPIT", "AUDIO", "UPHOLSTERY"},
        "image": "lifestyle.jpg",
    },
]

def _money(value: float | int | None) -> str:
    value = float(value or 0)
    if value.is_integer():
        formatted = f"{value:,.0f}"
    else:
        formatted = f"{value:,.2f}"
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"€ {formatted}"

def _chunks(items: list[dict[str, Any]], size: int = 6) -> list[list[dict[str, Any]]]:
    return [items[i:i + size] for i in range(0, len(items), size)] or [[]]

def build_pdf(configuration: dict[str, Any], catalog: dict[str, Any], evaluation: dict[str, Any]) -> bytes:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from weasyprint import HTML

    selected_codes = set(configuration.get("selectedOptions", []))
    selected = [option for option in catalog["options"] if option["code"] in selected_codes]
    group_labels = {group["code"]: group["label"] for group in catalog["groups"]}
    chapter_pages = []
    for chapter in CHAPTERS:
        chapter_items = [item for item in selected if item["group"] in chapter["groups"]]
        for page_index, chunk in enumerate(_chunks(chapter_items)):
            grouped = []
            for group_code in [g["code"] for g in catalog["groups"] if g["code"] in chapter["groups"]]:
                entries = [item for item in chunk if item["group"] == group_code]
                if entries:
                    grouped.append({"label": group_labels.get(group_code, group_code), "items": entries})
            if grouped:
                chapter_pages.append({**chapter, "continued": page_index > 0, "groups_data": grouped})

    pricing = evaluation.get("pricing", configuration.get("pricingSnapshot", {}))
    boat_discount = float(pricing.get("boatSubtotal", 0)) * float(configuration.get("discounts", {}).get("boatPct", 0)) / 100
    accessories_discount = float(pricing.get("discountTotal", 0)) - boat_discount
    assets = PDF_ROOT / "assets"
    env = Environment(loader=FileSystemLoader(PDF_ROOT), autoescape=select_autoescape(["html", "xml"]))
    env.filters["money"] = _money
    template = env.get_template("quote.html")
    html = template.render(
        configuration=configuration,
        customer=configuration.get("customer", {}),
        pricing=pricing,
        model=catalog["model"],
        chapter_pages=chapter_pages,
        boat_discount=boat_discount,
        accessories_discount=accessories_discount,
        generated_at=datetime.now().strftime("%d %B %Y"),
        logo_dark=(assets / "logo-dark-transparent.png").as_uri(),
        logo_light=(assets / "logo-light-transparent.png").as_uri(),
        cover=(assets / "cover-sunset.jpg").as_uri(),
        summary=(assets / "summary-sea.jpg").as_uri(),
        deck=(assets / "detail-deck.jpg").as_uri(),
        helm=(assets / "detail-helm.jpg").as_uri(),
        controls=(assets / "detail-controls.jpg").as_uri(),
        closing=(assets / "closing.jpg").as_uri(),
        assets_root=assets.as_uri(),
        product_assets=(APP_ROOT / "static").as_uri(),
    )
    return HTML(string=html, base_url=str(APP_ROOT)).write_pdf()
