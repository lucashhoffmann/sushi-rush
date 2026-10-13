import {
  buildLevel,
  isSolid,
  passGap,
  stationSlots,
  tableSlots,
  tileCenter,
} from '@/app/modules/level/utils/layout.util';
import { pathBeside, pathTo } from '@/app/modules/level/utils/pathfinding.util';
import { restaurantWith } from '@/test/world.fixture';

describe('planta do restaurante', () => {
  it.each([0, 1, 2])(
    'expansao %i: da porta se chega a toda mesa, caixa, estacao e passa-pratos',
    (expansion) => {
      const stations = stationSlots(expansion);
      const {
        layout,
        tables,
        registers,
        stations: built,
      } = buildLevel(
        restaurantWith({
          expansion,
          tables: tableSlots(expansion),
          bigTables: true,
          registers: 3,
          stations: { board: stations - 2, stove: 1, steamer: 1 },
        }),
      );
      const door = tileCenter(layout.doorX, 2);
      expect(tables).toHaveLength(tableSlots(expansion));
      expect(built).toHaveLength(stations);
      expect(registers).toHaveLength(3);
      for (const table of tables) {
        expect(pathBeside(layout, door, table.pos)).not.toBeNull();
      }
      for (const register of registers) {
        expect(pathTo(layout, door, register.front)).not.toBeNull();
        expect(pathTo(layout, door, register.back)).not.toBeNull();
      }
      for (const station of built) {
        expect(pathTo(layout, door, station.front)).not.toBeNull();
      }
      for (const spot of layout.pass) {
        expect(isSolid(layout, Math.floor(spot.x), Math.floor(spot.y))).toBe(
          true,
        );
        expect(pathBeside(layout, door, spot)).not.toBeNull();
      }
      // vao do meio do passa-pratos, por onde se entra na cozinha
      for (const x of [passGap(layout.salonW), passGap(layout.salonW) + 1]) {
        expect(isSolid(layout, x, layout.kitchenY)).toBe(false);
      }
      // a mesa da gerente, na sala ao lado
      expect(pathBeside(layout, door, layout.desk)).not.toBeNull();
      expect(isSolid(layout, layout.salonW, 5)).toBe(true);
      // da calcada para dentro so pelo portao
      expect(pathTo(layout, layout.spawn, door)).not.toBeNull();
      for (const spot of layout.queue) {
        expect(pathTo(layout, layout.spawn, spot)).not.toBeNull();
      }
    },
  );
});
