import { describe, expect, it } from 'vitest';
import { ATTACHMENT_CARDS, DEFAULT_CARD_LAYOUT, layoutOfCard } from './attachment-cards';
import { TestBed } from '@angular/core/testing';

describe('layoutOfCard', () => {
    it('gives a card without declared traits the default layout', () => {
        expect(layoutOfCard({ component: class {} })).toEqual(DEFAULT_CARD_LAYOUT);
        expect(layoutOfCard(null)).toEqual(DEFAULT_CARD_LAYOUT);
    });

    it('lets declared traits override the defaults one by one', () => {
        expect(layoutOfCard({ component: class {}, layout: { width: 'fill' } })).toEqual({ ...DEFAULT_CARD_LAYOUT, width: 'fill' });
    });

    it('lays out the stock cards: video always inset above its bar, image by room, text full width', () => {
        const cards = TestBed.inject(ATTACHMENT_CARDS);
        expect(layoutOfCard(cards.video ?? null)).toMatchObject({ inset: 'always', clearsPlaybackBar: true });
        expect(layoutOfCard(cards.image ?? null).inset).toBe('when-fits');
        expect(layoutOfCard(cards.text ?? null).width).toBe('fill');
    });
});
