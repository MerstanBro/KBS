from typing import Any

from constants import DEFAULT_PRETEST
from facts import Pavilion, SearchNode, SystemControl, SystemMeta
from helpers import calc_bc, calc_h, calc_strict_upper_bound, parse_pretest


def declare_pavilion_facts(engine, pavilions: list[dict[str, Any]] | tuple) -> None:
    for pavilion in pavilions:
        if isinstance(pavilion, dict):
            engine.declare(
                Pavilion(
                    pid=pavilion["pid"],
                    x=pavilion["x"],
                    y=pavilion["y"],
                    type=pavilion["type"],
                    color=pavilion["color"],
                    needed=pavilion["needed"],
                    delivered=pavilion.get("delivered", 0),
                )
            )
        else:
            engine.declare(
                Pavilion(
                    pid=pavilion[0],
                    x=pavilion[1],
                    y=pavilion[2],
                    type=pavilion[3],
                    color=pavilion[4],
                    needed=pavilion[5],
                    delivered=pavilion[6],
                )
            )


def declare_board(
    engine,
    *,
    upper_bound: int,
    max_load: int,
    warehouse_x: int,
    warehouse_y: int,
    start_x: int,
    start_y: int,
    pavilions: list[dict[str, Any]] | tuple,
) -> None:
    engine.declare(SystemControl(phase="search"))
    engine.declare(
        SystemMeta(
            upper_bound=upper_bound,
            max_load=max_load,
            warehouse_x=warehouse_x,
            warehouse_y=warehouse_y,
            start_x=start_x,
            start_y=start_y,
        )
    )
    declare_pavilion_facts(engine, pavilions)
    engine.declare(
        SearchNode(
            id=engine.next_id(),
            pid=0,
            state="collect",
            status="open",
            rx=start_x,
            ry=start_y,
            g=0,
            h=calc_h(0, 0, 0, 0, 0, 0, 0, 0, 0, start_x, start_y),
            f=calc_bc(0, 0),
            bc=calc_bc(0, 0),
            action="System Frame Initialization",
        )
    )


def declare_board_from_pretest(engine, pretest_data: dict) -> dict:
    meta, pavilions, start_x, start_y = parse_pretest(pretest_data)
    strict_ub = calc_strict_upper_bound(
        pavilions,
        start_x,
        start_y,
        meta["warehouse_x"],
        meta["warehouse_y"],
    )
    declare_board(
        engine,
        upper_bound=strict_ub,
        max_load=meta["max_load"],
        warehouse_x=meta["warehouse_x"],
        warehouse_y=meta["warehouse_y"],
        start_x=start_x,
        start_y=start_y,
        pavilions=pretest_data["pavilions"],
    )
    return pretest_data


def declare_default_board(engine) -> None:
    declare_board_from_pretest(engine, DEFAULT_PRETEST)
