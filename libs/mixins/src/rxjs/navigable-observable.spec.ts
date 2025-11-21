import { BehaviorSubject, firstValueFrom } from 'rxjs';
import './navigable-observable';

describe('observeProperty', () => {
    interface Wheel {
        color: string;
        diameter: number;
    }

    interface Car {
        wheel: Wheel;
        brand: string;
        year: number;
    }

    it('should observe top-level object property', async () => {
        const car$ = new BehaviorSubject<Car>({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        const props = car$.observeProperty();

        const wheel = await firstValueFrom(props.wheel.$());
        expect(wheel).toEqual({ color: 'black', diameter: 18 });
    });

    it('should observe nested primitive property', async () => {
        const car$ = new BehaviorSubject<Car>({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        const props = car$.observeProperty();

        const color = await firstValueFrom(props.wheel.color.$());
        expect(color).toBe('black');
    });

    it('should observe top-level primitive property', async () => {
        const car$ = new BehaviorSubject<Car>({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        const props = car$.observeProperty();

        const brand = await firstValueFrom(props.brand.$());
        expect(brand).toBe('Tesla');
    });

    it('should emit distinct values only', () => {
        const car$ = new BehaviorSubject<Car>({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        const props = car$.observeProperty();
        const colors: string[] = [];

        props.wheel.color.$().subscribe((color) => {
            colors.push(color);
        });

        // Emit same value - should not trigger
        car$.next({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        // Emit different value - should trigger
        car$.next({
            wheel: { color: 'red', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        // Emit same value again - should not trigger
        car$.next({
            wheel: { color: 'red', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        expect(colors).toEqual(['black', 'red']);
    });

    it('should handle nested object changes', () => {
        const car$ = new BehaviorSubject<Car>({
            wheel: { color: 'black', diameter: 18 },
            brand: 'Tesla',
            year: 2024,
        });

        const props = car$.observeProperty();
        const wheels: Wheel[] = [];

        props.wheel.$().subscribe((wheel) => {
            wheels.push(wheel);
        });

        car$.next({
            wheel: { color: 'red', diameter: 20 },
            brand: 'Tesla',
            year: 2024,
        });

        expect(wheels).toEqual([
            { color: 'black', diameter: 18 },
            { color: 'red', diameter: 20 },
        ]);
    });

    it('should handle multiple nested levels', async () => {
        interface Lock {
            type: string;
            isLocked: boolean;
        }

        interface Door {
            handle: string;
            material: string;
            lock: Lock;
        }

        interface House {
            door: Door;
            roof: string;
        }

        const house$ = new BehaviorSubject<House>({
            door: {
                handle: 'brass',
                material: 'wood',
                lock: { type: 'deadbolt', isLocked: true },
            },
            roof: 'tile',
        });

        const props = house$.observeProperty();

        const lockType = await firstValueFrom(props.door.lock.type.$());
        expect(lockType).toBe('deadbolt');
    });
});
