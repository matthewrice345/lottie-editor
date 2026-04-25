export class History {
    past = [];
    present;
    future = [];
    cap;
    constructor(initial, cap = 50) {
        this.present = initial;
        this.cap = cap;
    }
    get current() {
        return this.present;
    }
    get canUndo() {
        return this.past.length > 0;
    }
    get canRedo() {
        return this.future.length > 0;
    }
    push(next) {
        this.past.push(this.present);
        if (this.past.length > this.cap)
            this.past.shift();
        this.present = next;
        this.future = [];
    }
    undo() {
        if (!this.canUndo)
            return null;
        this.future.unshift(this.present);
        this.present = this.past.pop();
        return this.present;
    }
    redo() {
        if (!this.canRedo)
            return null;
        this.past.push(this.present);
        this.present = this.future.shift();
        return this.present;
    }
    reset(initial) {
        this.past = [];
        this.future = [];
        this.present = initial;
    }
}
//# sourceMappingURL=history.js.map