import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CARDS } from '../game';
import { CardInspector } from './CardInspector';

const source = CARDS.find((card) => card.id === 'sabueso-brasa')!;

afterEach(cleanup);

describe('CardInspector', () => {
  it('renders a labelled modal with glossary definitions', () => {
    render(<CardInspector card={source} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: source.name })).toBeInTheDocument();
    expect(screen.getAllByRole('term', { name: /Impulso:/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tooltip', { hidden: true }).some((tooltip) => tooltip.textContent?.includes('mismo turno'))).toBe(true);
  });

  it('closes with Escape and the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CardInspector card={source} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /cerrar inspección/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not mount when closed', () => {
    render(<CardInspector card={source} open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite ver el original y consultar después los estados de esta copia', async () => {
    const user = userEvent.setup();
    render(<CardInspector card={source} statusEffects={['frozen']} onClose={vi.fn()} />);
    expect(screen.getByRole('img', { name: source.art.alt })).toHaveAttribute('src', expect.stringContaining('/art-full/'));
    await user.click(screen.getByRole('button', { name: 'Carta completa' }));
    expect(screen.getByLabelText('Estados activos')).toHaveTextContent('Congelada');
    await user.click(screen.getByRole('button', { name: 'Ilustración' }));
    expect(screen.queryByLabelText('Estados activos')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ilustración' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('respalda las ilustraciones antiguas hasta el SVG cuando faltan ambos WebP', () => {
    render(<CardInspector card={source} onClose={vi.fn()} />);
    const art = screen.getByRole('img', { name: source.art.alt });
    fireEvent.error(art);
    expect(art).toHaveAttribute('src', expect.stringContaining('/cards/art/'));
    fireEvent.error(art);
    expect(art).toHaveAttribute('src', expect.stringContaining(source.art.fallback));
  });
});
