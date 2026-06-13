from experta import AS, MATCH, NOT, Rule, TEST

from facts import FindNext, Link, Moving, PathExpand, PrintStep, SearchNode, SystemControl
from helpers import (
    action_extra_cost,
    classify_action,
    distribute_cost,
    format_action_line,
    format_move_line,
)


class PathRules:
    def emit_path_line(self, line: str, step: int, g: int, f: int) -> None:
        self._path_commands.append(line)
        if self.live_mode:
            self.emit("PATH_COMMAND", {"step": step, "line": line, "g_n": g, "f_n": f})
        else:
            print(line)

    def finish_print_step(
        self,
        curr: int,
        step: int,
        act: str,
        rx: int,
        ry: int,
        g: int,
        f: int,
        state: str,
    ) -> None:
        if self.live_mode:
            self.emit(
                "ROBOT_MOVE",
                {
                    "step": step,
                    "id": curr,
                    "to_x": rx,
                    "to_y": ry,
                    "state": state,
                    "action": act,
                    "g_n": g,
                    "f_n": f,
                },
            )
            self.emit(
                "TIMELINE_STEP",
                {
                    "step": step,
                    "node_id": curr,
                    "action": act,
                    "pos": [rx, ry],
                    "state": state,
                    "g_n": g,
                    "f_n": f,
                },
            )

        self._path_prev = {"x": rx, "y": ry, "g": g}
        self.declare(FindNext(parent=curr, step=step + 1))

    @Rule(
        AS.ctrl << SystemControl(phase="print_fwd"),
        AS.ps << PrintStep(id=MATCH.curr, step=MATCH.step),
        Link(child=MATCH.curr, action=MATCH.act, rx=MATCH.rx, ry=MATCH.ry),
        SearchNode(id=MATCH.curr, g=MATCH.g, f=MATCH.f, state=MATCH.state),
    )
    def begin_print_step(self, ctrl, ps, curr, step, act, rx, ry, g, f, state):
        self.retract(ps)

        command, detail = classify_action(act)
        if command == "robot start":
            line = f"robot start | {detail} | pos=({rx},{ry}) | +0 | g={g}"
            self.emit_path_line(line, step, g, f)
            self.finish_print_step(curr, step, act, rx, ry, g, f, state)
            return

        prev = self._path_prev
        prev_g = prev["g"] if prev else g
        extra = action_extra_cost(command)
        move_cost = max(0, g - prev_g - extra)
        needs_move = prev is not None and (prev["x"] != rx or prev["y"] != ry)

        if not needs_move:
            if command:
                inc = g - prev_g
                line = format_action_line(command, detail, state, rx, ry, inc, g)
                self.emit_path_line(line, step, g, f)
            self.finish_print_step(curr, step, act, rx, ry, g, f, state)
            return

        self._path_step_log = []
        self.declare(
            PathExpand(
                from_x=prev["x"],
                from_y=prev["y"],
                from_g=prev_g,
                to_x=rx,
                to_y=ry,
                to_g=g,
                move_cost=move_cost,
                command=command or "",
                detail=detail,
                state=state,
                step=step,
                node_id=curr,
                f_n=f,
                action=act,
            )
        )
        self.declare(
            Moving(
                curr_x=prev["x"],
                curr_y=prev["y"],
                dest_x=rx,
                dest_y=ry,
                node_id=curr,
                step=step,
            )
        )
        self.modify(ctrl, phase="expand_path")

    @Rule(
        AS.ctrl << SystemControl(phase="expand_path"),
        AS.pe << PathExpand(
            from_g=MATCH.from_g,
            to_g=MATCH.to_g,
            move_cost=MATCH.move_cost,
            command=MATCH.command,
            detail=MATCH.detail,
            state=MATCH.state,
            step=MATCH.step,
            node_id=MATCH.node_id,
            f_n=MATCH.f_n,
            to_x=MATCH.to_x,
            to_y=MATCH.to_y,
            action=MATCH.act,
        ),
        AS.move << Moving(
            curr_x=MATCH.cx,
            curr_y=MATCH.cy,
            dest_x=MATCH.dx,
            dest_y=MATCH.dy,
        ),
        TEST(lambda cx, cy, dx, dy: cx == dx and cy == dy),
        salience=5000,
    )
    def path_arrived(self, ctrl, pe, move, from_g, to_g, move_cost, command, detail, state, step, node_id, f_n, to_x, to_y, act):
        running_g = from_g
        increments = distribute_cost(move_cost, len(self._path_step_log))

        for (label, mx, my), inc in zip(self._path_step_log, increments):
            running_g += inc
            line = format_move_line(label, mx, my, inc, running_g)
            self.emit_path_line(line, step, running_g, f_n)

        if command:
            inc = to_g - running_g
            line = format_action_line(command, detail, state, to_x, to_y, inc, to_g)
            self.emit_path_line(line, step, to_g, f_n)

        self.retract(pe)
        self.retract(move)
        self._path_step_log = []
        self.modify(ctrl, phase="print_fwd")
        self.finish_print_step(node_id, step, act, to_x, to_y, to_g, f_n, state)
