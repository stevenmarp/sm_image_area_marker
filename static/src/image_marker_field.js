/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import {
    Many2ManyBinaryField,
    many2ManyBinaryField,
} from "@web/views/fields/many2many_binary/many2many_binary_field";
import { ImageMarkerDialog } from "./image_marker_dialog";
import { useState } from "@odoo/owl";

/**
 * A many2many of attachments where clicking a picture opens it to be marked.
 *
 * Uploading, removing and downloading stay exactly what they are on the standard
 * many2many_binary widget: only what a click on the picture does is different.
 */
export class ImageMarkerField extends Many2ManyBinaryField {
    static template = "sm_image_area_marker.ImageMarkerField";
    static components = { ...Many2ManyBinaryField.components };

    setup() {
        super.setup();
        this.dialog = useService("dialog");
        // A marked picture is written over the old one and keeps its id, so nothing in the
        // url changes and the browser would go on showing what it already has. This holds
        // one stamp per picture to ask for it again.
        this.marked = useState({});
    }

    version(file) {
        return this.marked[file.id] || file.checksum || "";
    }

    imageUrl(file) {
        const unique = this.version(file);
        return `/web/image/${file.id}${unique ? `?unique=${unique}` : ""}`;
    }

    openMarker(file) {
        if (!this.isImage(file)) {
            return this.notification.add(_t("Only pictures can be marked."), {
                type: "warning",
            });
        }
        this.dialog.add(ImageMarkerDialog, {
            attachmentId: file.id,
            name: file.name,
            mimetype: file.mimetype,
            version: this.version(file),
            readonly: this.props.readonly,
            onSaved: () => {
                this.marked[file.id] = Date.now();
            },
        });
    }
}

export const imageMarkerField = {
    ...many2ManyBinaryField,
    component: ImageMarkerField,
    // the checksum tells the picture apart from the version of it that was there before
    relatedFields: [...many2ManyBinaryField.relatedFields, { name: "checksum", type: "char" }],
};

registry.category("fields").add("image_marker", imageMarkerField);
