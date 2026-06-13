from queue import Queue
from typing import Any, Optional

from experta import KnowledgeEngine

from constants import DEFAULT_PRETEST
from facts import SearchNode
from helpers import calc_bc, calc_h
from initialization import declare_board_from_pretest, declare_default_board
from rules_constraints import ConstraintRules
from rules_inventory import InventoryRules
from rules_movement import MovementRules
from rules_path import PathRules
from rules_search import SearchRules


class FlowerDeliveryEngine(
    KnowledgeEngine,
    ConstraintRules,
    InventoryRules,
    MovementRules,
    PathRules,
    SearchRules,
):
    def __init__(
        self,
        message_queue: Optional[Queue] = None,
        pretest_data: Optional[dict] = None,
        live_mode: bool = False,
    ):
        super().__init__()
        self.node_counter = 0
        self.message_queue = message_queue
        self.pretest_data = pretest_data or DEFAULT_PRETEST
        self.live_mode = live_mode or message_queue is not None
        self._path_prev: dict[str, int] | None = None
        self._path_commands: list[str] = []
        self._path_step_log: list[tuple[str, int, int]] = []

    def next_id(self):
        self.node_counter += 1
        return self.node_counter

    def emit(self, event_type: str, data: dict[str, Any]):
        if self.message_queue is not None:
            self.message_queue.put({"event": event_type, "data": data})

    def clone_node(self, node, new_state, add_g=0, **kwargs):
        defaults = {
            "i_rr": 0,
            "i_rp": 0,
            "i_rw": 0,
            "i_tr": 0,
            "i_ty": 0,
            "i_op": 0,
            "i_opi": 0,
            "i_rgg": 0,
            "i_rglp": 0,
            "d_rr": 0,
            "d_rp": 0,
            "d_rw": 0,
            "d_tr": 0,
            "d_ty": 0,
            "d_op": 0,
            "d_opi": 0,
            "d_rgg": 0,
            "d_rglp": 0,
            "tot_i": 0,
            "tot_d": 0,
            "last_item": 1,
        }
        d = {**defaults, **dict(node)}
        del d["__factid__"]
        d.update(kwargs)

        d["id"] = self.next_id()
        d["pid"] = node["id"]
        d["state"] = new_state
        d["status"] = "open"
        d["g"] += add_g
        d["h"] = calc_h(
            d["d_rr"],
            d["d_rp"],
            d["d_rw"],
            d["d_tr"],
            d["d_ty"],
            d["d_op"],
            d["d_opi"],
            d["d_rgg"],
            d["d_rglp"],
            d["rx"],
            d["ry"],
        )
        d["bc"] = calc_bc(d["tot_d"], d["tot_i"])
        d["f"] = d["g"] + max(d["h"], d["bc"])
        self.declare(SearchNode(**d))

    def initialize_board(self, pretest_data: Optional[dict] = None) -> dict:
        data = pretest_data or self.pretest_data
        if self.live_mode:
            self.emit("BOARD_SETUP", data)
        return declare_board_from_pretest(self, data)

    def startup(self):
        self.reset()
        self.initialize_board()
        self.run()
        if self.live_mode:
            self.emit("DONE", {"message": "Execution finished"})


if __name__ == "__main__":
    engine = FlowerDeliveryEngine()
    engine.reset()

    declare_default_board(engine)
    engine.run()
