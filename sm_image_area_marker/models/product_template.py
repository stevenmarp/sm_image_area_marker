from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    # A field of its own rather than the record's attachments: the pictures worth marking
    # are the ones somebody chose to put here, not every file that ever landed on the
    # product.
    marked_image_ids = fields.Many2many(
        "ir.attachment",
        "sm_product_template_marked_image_rel",
        "product_tmpl_id",
        "attachment_id",
        string="Marked Images",
        domain=[("mimetype", "like", "image/%")],
        help="Pictures that can be marked. Click one to draw on it; saving replaces the "
             "picture with the marked version.",
    )
