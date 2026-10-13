import { fireEvent, render, screen } from '@testing-library/react';

import { VirtualJoystick } from '@/resources/components/base/virtual-joystick/virtual-joystick.component';

function setup() {
  const onMove = vi.fn();
  render(<VirtualJoystick onMove={onMove} />);
  const zone = screen.getByLabelText('Joystick');
  vi.spyOn(zone, 'getBoundingClientRect').mockReturnValue({
    left: 52,
    top: 52,
    width: 96,
    height: 96,
  } as DOMRect);
  fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100, clientY: 100 });
  return { onMove, zone };
}

describe('VirtualJoystick', () => {
  it('mostra a dica em infinito ate o primeiro toque, e nao volta depois', () => {
    render(<VirtualJoystick onMove={vi.fn()} />);
    const zone = screen.getByLabelText('Joystick');
    const knob = zone.querySelector('[data-hint]')!;
    expect(knob).toHaveClass('joystick-hint');
    // na dica quem move e a animacao, nao o estilo
    expect(knob).not.toHaveAttribute('style');

    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(knob).not.toHaveClass('joystick-hint');
    fireEvent.pointerUp(zone, { pointerId: 1 });
    expect(knob).not.toHaveClass('joystick-hint');
    expect(knob).toHaveAttribute('style');
  });

  it('em repouso o disco fica no canto esquerdo, embaixo', () => {
    render(<VirtualJoystick onMove={vi.fn()} />);
    const disc = screen.getByLabelText('Joystick').firstElementChild!;
    expect(disc).toHaveAttribute('data-active', 'false');
    // longe dos botoes, que ficam no canto direito
    expect((disc as HTMLElement).style.left).not.toBe('50%');
    expect((disc as HTMLElement).style.transform).toBe('');
  });

  it('a area de toque e a faixa de baixo da tela inteira', () => {
    render(<VirtualJoystick onMove={vi.fn()} />);
    expect(screen.getByLabelText('Joystick')).toHaveClass(
      'inset-x-0',
      'bottom-0',
      'h-[45%]',
    );
  });

  it('o disco nasce onde o dedo toca e volta ao repouso ao soltar', () => {
    const { onMove, zone } = setup();
    const disc = zone.firstElementChild!;
    // toque em (100, 100) com a area comecando em (52, 52)
    expect(disc).toHaveAttribute('data-active', 'true');
    expect(disc).toHaveStyle({ left: '48px', top: '48px' });
    // tocar nao anda: o ponto tocado vira o centro
    expect(onMove).toHaveBeenLastCalledWith(0, 0);

    fireEvent.pointerUp(zone, { pointerId: 1 });
    expect(disc).toHaveAttribute('data-active', 'false');
  });

  it('arrastar para cima anda para frente, proporcional ao raio', () => {
    const { onMove, zone } = setup();
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 100, clientY: 86 });
    expect(onMove).toHaveBeenLastCalledWith(0, 0.5);
  });

  it('cada novo toque vira o centro, em qualquer ponto da area', () => {
    const { onMove, zone } = setup();
    fireEvent.pointerUp(zone, { pointerId: 1 });
    fireEvent.pointerDown(zone, { pointerId: 2, clientX: 300, clientY: 70 });
    expect(onMove).toHaveBeenLastCalledWith(0, 0);
    fireEvent.pointerMove(zone, { pointerId: 2, clientX: 314, clientY: 70 });
    expect(onMove).toHaveBeenLastCalledWith(0.5, 0);
  });

  it('limita o vetor ao raio', () => {
    const { onMove, zone } = setup();
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 400, clientY: -200 });
    const [moveX, moveY] = onMove.mock.lastCall!;
    expect(Math.hypot(moveX, moveY)).toBeCloseTo(1);
    expect(moveX).toBeCloseTo(Math.SQRT1_2);
    expect(moveY).toBeCloseTo(Math.SQRT1_2);
  });

  it('soltar zera o input', () => {
    const { onMove, zone } = setup();
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 130, clientY: 100 });
    fireEvent.pointerUp(zone, { pointerId: 1 });
    expect(onMove).toHaveBeenLastCalledWith(0, 0);
  });

  it('ignora outro dedo ate o primeiro soltar', () => {
    const { onMove, zone } = setup();
    fireEvent.pointerMove(zone, { pointerId: 2, clientX: 140, clientY: 100 });
    fireEvent.pointerUp(zone, { pointerId: 2 });
    expect(onMove).toHaveBeenLastCalledWith(0, 0);

    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 114, clientY: 100 });
    expect(onMove).toHaveBeenLastCalledWith(0.5, 0);
  });

  it('ignora movimento sem toque ativo', () => {
    const onMove = vi.fn();
    render(<VirtualJoystick onMove={onMove} />);
    fireEvent.pointerMove(screen.getByLabelText('Joystick'), {
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(onMove).not.toHaveBeenCalled();
  });
});
