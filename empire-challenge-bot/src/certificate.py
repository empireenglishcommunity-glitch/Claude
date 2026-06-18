"""Generate a PDF completion certificate for a participant. 100% free (reportlab).

Arabic text needs reshaping + bidi handling so letters connect and read RTL.
"""
import os
from datetime import date
from . import config


def _shape(text: str) -> str:
    """Reshape Arabic so it renders correctly in the PDF."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except Exception:
        return text


def make_certificate(username: str, completed: int, rank_name: str) -> str:
    """Create a certificate PDF and return its file path."""
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas

    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    safe = "".join(ch for ch in username if ch.isalnum() or ch in (" ", "_", "-")).strip()
    path = os.path.join(config.OUTPUT_DIR, f"certificate_{safe or 'participant'}.pdf")

    width, height = landscape(A4)
    c = canvas.Canvas(path, pagesize=landscape(A4))

    # Background + gold border
    c.setFillColor(colors.HexColor("#0f1419"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#d4af37"))
    c.setLineWidth(4)
    c.rect(15 * mm, 15 * mm, width - 30 * mm, height - 30 * mm, fill=0, stroke=1)
    c.setLineWidth(1)
    c.rect(18 * mm, 18 * mm, width - 36 * mm, height - 36 * mm, fill=0, stroke=1)

    cx = width / 2

    c.setFillColor(colors.HexColor("#d4af37"))
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(cx, height - 50 * mm, _shape("شهادة إتمام التحدّي"))

    c.setFillColor(colors.white)
    c.setFont("Helvetica", 16)
    c.drawCentredString(cx, height - 68 * mm, _shape("تشهد Empire English Community بأن"))

    c.setFillColor(colors.HexColor("#ffd700"))
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(cx, height - 88 * mm, _shape(username))

    c.setFillColor(colors.white)
    c.setFont("Helvetica", 15)
    c.drawCentredString(
        cx, height - 104 * mm,
        _shape(f"قد أتمّ {completed} من 30 تحدّيًا في برنامج (كن مرتاحًا مع عدم الراحة)"),
    )

    c.setFillColor(colors.HexColor("#d4af37"))
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, height - 124 * mm, _shape(f"الرتبة: {rank_name}"))

    c.setFillColor(colors.HexColor("#888888"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(cx, 30 * mm, _shape(f"التاريخ: {date.today().isoformat()}"))

    c.showPage()
    c.save()
    return path
