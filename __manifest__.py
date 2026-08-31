{
    "name": "Image Area Marker",
    "version": "1.0.0",
    "category": "Extra Tools",
    "summary": "Mark an area on a picture and save the marked picture back over it",
    "description": """
Image Area Marker
=================

A photograph of a dented door says where the dent is only to whoever took it. Everybody
who reads the file afterwards has to be told again, in words.

This adds an image_marker widget for many2many fields of attachments. Several pictures
are uploaded to a record, from as many angles as the job needs. Clicking one opens it in
an editor, where a box, an arrow, a line drawn by hand, a highlight or a written note is
put straight on top of the picture.

Saving replaces the original with the marked one. The attachment keeps its id, so
everything already pointing at that picture goes on pointing at it and now shows the
marks: a repair order, a claim, an estimate, a message in the chatter.

Products carry such a field out of the box, under Marked Images. The widget itself is
not tied to products: any many2many of ir.attachment can use it.
    """,
    "author": "Steven Marp",
    "website": "https://apps.odoo.com/apps/modules/browse?author=Steven Marp",
    "license": "OPL-1",
    "depends": ["product"],
    "data": [
        "views/product_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "sm_image_area_marker/static/src/image_marker.scss",
            "sm_image_area_marker/static/src/image_marker_dialog.js",
            "sm_image_area_marker/static/src/image_marker_dialog.xml",
            "sm_image_area_marker/static/src/image_marker_field.js",
            "sm_image_area_marker/static/src/image_marker_field.xml",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
    "images": ["static/description/banner.gif", "static/description/icon.png"],
    "price": 30.00,
    "currency": "USD",
}
