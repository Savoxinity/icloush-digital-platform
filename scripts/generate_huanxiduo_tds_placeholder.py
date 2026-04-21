from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas

OUTPUT = "/home/ubuntu/webdev-static-assets/huanxiduo/huanxiduo-tds-placeholder.pdf"

pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))

c = canvas.Canvas(OUTPUT, pagesize=A4)
width, height = A4

c.setTitle("Huanxiduo TDS Placeholder")
c.setStrokeColorRGB(0.0, 0.184, 0.655)
c.setFillColorRGB(0.01, 0.03, 0.06)

c.setLineWidth(1)
c.rect(36, 36, width - 72, height - 72)

c.setFont("Helvetica-Bold", 20)
c.drawString(56, height - 80, "HUANXIDUO TECH")

c.setFont("Helvetica", 10)
c.drawString(56, height - 98, "TECHNICAL DATA SHEET / PLACEHOLDER")

c.setFont("STSong-Light", 28)
c.drawString(56, height - 150, "环洗朵技术规格书占位版")

c.setFont("STSong-Light", 12)
text = c.beginText(56, height - 200)
text.setLeading(22)
for line in [
    "当前文件用于前台 DOWNLOAD TDS 行为联调与界面验收。",
    "正式交付时请替换为每个单品对应的真实技术规格书 PDF。",
    "建议后续字段至少包括：产品名称、包装规格、适用场景、推荐浓度、注意事项、检测或认证信息。",
    "当前官网已完成下载动作接线，可在后台或内容系统中替换为真实文件。",
]:
    text.textLine(line)
c.drawText(text)

rows = [
    ("品牌", "环洗朵科技 / HUANXIDUO TECH"),
    ("用途", "前台 DOWNLOAD TDS 下载占位资源"),
    ("适用页面", "/tech 产品矩阵"),
    ("状态", "READY FOR REAL FILE REPLACEMENT"),
]

y = height - 350
for key, value in rows:
    c.line(56, y + 18, width - 56, y + 18)
    c.setFont("STSong-Light", 11)
    c.drawString(56, y, key)
    c.setFont("Helvetica", 11)
    c.drawString(170, y, value)
    y -= 48

c.showPage()
c.save()
