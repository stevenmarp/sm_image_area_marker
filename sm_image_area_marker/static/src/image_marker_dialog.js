/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { Dialog } from "@web/core/dialog/dialog";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, onMounted, useRef, useState } from "@odoo/owl";

/**
 * The editor behind the image_marker widget.
 *
 * Everything drawn is kept as a list of shapes in the coordinates of the picture itself,
 * never of the screen. The canvas is the size of the picture and is scaled down by CSS to
 * fit the dialog, so a mark put on a corner on a laptop sits on that same corner in the
 * saved file, whatever the screen it was drawn on.
 */
export class ImageMarkerDialog extends Component {
    static template = "sm_image_area_marker.ImageMarkerDialog";
    static components = { Dialog };
    static props = {
        attachmentId: Number,
        name: { type: String, optional: true },
        mimetype: { type: String, optional: true },
        version: { type: [String, Number], optional: true },
        readonly: { type: Boolean, optional: true },
        onSaved: { type: Function, optional: true },
        close: Function,
    };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.canvasRef = useRef("canvas");
        this.state = useState({
            tool: "box",
            color: "#e2001a",
            size: 2,
            note: "",
            shapes: [],
            saving: false,
        });
        this.drawing = null;

        onWillStart(async () => {
            this.image = await this._loadImage();
        });
        onMounted(() => {
            const canvas = this.canvasRef.el;
            canvas.width = this.image.naturalWidth;
            canvas.height = this.image.naturalHeight;
            this.redraw();
        });
    }

    // ------------------------------------------------------------------ the picture
    _loadImage() {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", () =>
                reject(new Error(_t("This picture could not be read.")))
            );
            // the id alone would be served from the browser cache, and a picture that has
            // already been marked once would come back without its marks
            const unique = this.props.version || "";
            image.src = `/web/image/${this.props.attachmentId}${unique ? `?unique=${unique}` : ""}`;
        });
    }

    get tools() {
        return [
            { id: "box", label: _t("Box"), icon: "fa-square-o" },
            { id: "highlight", label: _t("Highlight"), icon: "fa-paint-brush" },
            { id: "arrow", label: _t("Arrow"), icon: "fa-long-arrow-right" },
            { id: "pen", label: _t("Pen"), icon: "fa-pencil" },
            { id: "text", label: _t("Note"), icon: "fa-font" },
        ];
    }

    get colors() {
        return ["#e2001a", "#ff8f00", "#ffde00", "#00a09d", "#1f6fde", "#000000", "#ffffff"];
    }

    /** A stroke has to read the same on a phone photo and on a scan, so it is a share of
     * the picture rather than a number of pixels. */
    get strokeWidth() {
        const base = Math.max(2, Math.round(this.canvasRef.el.width / 400));
        return base * this.state.size;
    }

    // ------------------------------------------------------------------ drawing
    _pointOf(ev) {
        const canvas = this.canvasRef.el;
        const box = canvas.getBoundingClientRect();
        const scale = canvas.width / box.width;
        return {
            x: Math.round((ev.clientX - box.left) * scale),
            y: Math.round((ev.clientY - box.top) * scale),
        };
    }

    onPointerDown(ev) {
        if (this.props.readonly || this.state.saving) {
            return;
        }
        const point = this._pointOf(ev);
        if (this.state.tool === "text") {
            const text = this.state.note.trim();
            if (!text) {
                return this.notification.add(_t("Type the note first, then click the spot."), {
                    type: "warning",
                });
            }
            this._push({ tool: "text", text, points: [point] });
            return;
        }
        this.drawing = {
            tool: this.state.tool,
            color: this.state.color,
            width: this.strokeWidth,
            points: [point, point],
        };
        this.canvasRef.el.setPointerCapture(ev.pointerId);
    }

    onPointerMove(ev) {
        if (!this.drawing) {
            return;
        }
        const point = this._pointOf(ev);
        if (this.drawing.tool === "pen") {
            this.drawing.points.push(point);
        } else {
            this.drawing.points[1] = point;
        }
        this.redraw();
    }

    onPointerUp() {
        if (!this.drawing) {
            return;
        }
        const shape = this.drawing;
        this.drawing = null;
        const [start, end] = [shape.points[0], shape.points.at(-1)];
        // a click that never moved is not a shape, it is a click
        const moved = Math.abs(end.x - start.x) > 3 || Math.abs(end.y - start.y) > 3;
        if (moved) {
            this._push(shape);
        } else {
            this.redraw();
        }
    }

    _push(shape) {
        this.state.shapes.push({
            color: this.state.color,
            width: this.strokeWidth,
            ...shape,
        });
        this.redraw();
    }

    undo() {
        this.state.shapes.pop();
        this.redraw();
    }

    clear() {
        this.state.shapes.length = 0;
        this.redraw();
    }

    // ------------------------------------------------------------------ painting
    redraw() {
        const canvas = this.canvasRef.el;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
        for (const shape of this.state.shapes) {
            this._paint(ctx, shape);
        }
        if (this.drawing) {
            this._paint(ctx, this.drawing);
        }
    }

    _paint(ctx, shape) {
        const [start, end] = [shape.points[0], shape.points.at(-1)];
        ctx.save();
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = shape.color;
        ctx.lineWidth = shape.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        switch (shape.tool) {
            case "box":
                ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
                break;
            case "highlight":
                ctx.globalAlpha = 0.35;
                ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
                break;
            case "arrow":
                this._arrow(ctx, start, end, shape.width);
                break;
            case "pen":
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (const point of shape.points.slice(1)) {
                    ctx.lineTo(point.x, point.y);
                }
                ctx.stroke();
                break;
            case "text": {
                const size = shape.width * 6;
                ctx.font = `bold ${size}px sans-serif`;
                ctx.textBaseline = "top";
                // a note has to stay readable over a dark photograph as well as a light one
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = Math.max(2, size / 8);
                ctx.strokeText(shape.text, start.x, start.y);
                ctx.fillText(shape.text, start.x, start.y);
                break;
            }
        }
        ctx.restore();
    }

    _arrow(ctx, start, end, width) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = Math.max(width * 4, 10);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - head * Math.cos(angle - Math.PI / 7),
            end.y - head * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
            end.x - head * Math.cos(angle + Math.PI / 7),
            end.y - head * Math.sin(angle + Math.PI / 7)
        );
        ctx.closePath();
        ctx.fill();
    }

    // ------------------------------------------------------------------ saving
    /** Keep the name honest: a picture saved as png must not go on being called .jpg. */
    _nameFor(mimetype) {
        const name = this.props.name || "";
        const extension = (mimetype || "").split("/")[1];
        if (!name || !extension || name.toLowerCase().endsWith(`.${extension}`)) {
            return name;
        }
        return name.includes(".")
            ? `${name.slice(0, name.lastIndexOf("."))}.${extension}`
            : `${name}.${extension}`;
    }

    async save() {
        if (this.state.saving) {
            return;
        }
        this.state.saving = true;
        try {
            this.redraw();
            const canvas = this.canvasRef.el;
            // a browser that cannot write the asked format answers with a png, so the
            // mimetype is read back from what came out rather than from what was asked
            const url = canvas.toDataURL(this.props.mimetype || "image/png");
            const mimetype = url.slice(5, url.indexOf(";"));
            const datas = url.slice(url.indexOf(",") + 1);
            const values = { datas, mimetype };
            const name = this._nameFor(mimetype);
            if (name && name !== this.props.name) {
                values.name = name;
            }
            // the same attachment, written over: everything already pointing at this
            // picture keeps pointing at it and now shows the marks
            await this.orm.write("ir.attachment", [this.props.attachmentId], values);
            this.props.onSaved?.();
            this.props.close();
        } finally {
            this.state.saving = false;
        }
    }
}
