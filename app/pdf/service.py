from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

PDF_ROOT = Path(__file__).parent
APP_ROOT = PDF_ROOT.parent


def build_pdf(configuration: dict[str, Any], catalog: dict[str, Any], evaluation: dict[str, Any]) -> bytes:
    # Lazy imports keep the rest of the application testable if native PDF dependencies
    # are not installed on a developer workstation yet.
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from weasyprint import HTML

    groups = {group["code"]: group for group in catalog["groups"]}
    selected_codes = set(configuration.get("selectedOptions", []))
    selected_options = [option for option in catalog["options"] if option["code"] in selected_codes]
    sections = []
    for group in catalog["groups"]:
        items = [item for item in selected_options if item["group"] == group["code"]]
        if items:
            sections.append({"label": group["label"], "items": items})

    env = Environment(
        loader=FileSystemLoader(PDF_ROOT),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("quote.html")
    html = template.render(
        configuration=configuration,
        customer=configuration.get("customer", {}),
        pricing=evaluation.get("pricing", configuration.get("pricingSnapshot", {})),
        sections=sections,
        model=catalog["model"],
        generated_at=datetime.now().strftime("%d/%m/%Y %H:%M"),
        logo_dark=(PDF_ROOT / "assets" / "novamarine-logo-dark.jpg").as_uri(),
        logo_light=(PDF_ROOT / "assets" / "novamarine-logo-light.png").as_uri(),
        hero=(APP_ROOT / "static" / "assets" / "boat.png").as_uri(),
        asset_root=(APP_ROOT / "static").as_uri(),
    )
    return HTML(string=html, base_url=str(APP_ROOT)).write_pdf()