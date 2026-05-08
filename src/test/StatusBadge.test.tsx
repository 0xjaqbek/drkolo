import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders "Oczekuje" for oczekuje status', () => {
    render(<StatusBadge status="oczekuje" />);
    expect(screen.getByText('Oczekuje')).toBeInTheDocument();
  });

  it('renders "W trakcie" for w_trakcie status', () => {
    render(<StatusBadge status="w_trakcie" />);
    expect(screen.getByText('W trakcie')).toBeInTheDocument();
  });

  it('renders "Gotowe" for gotowe status', () => {
    render(<StatusBadge status="gotowe" />);
    expect(screen.getByText('Gotowe')).toBeInTheDocument();
  });

  it('calls onStatusChange with next status when clicked', () => {
    const onChange = vi.fn();
    render(<StatusBadge status="oczekuje" onStatusChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('w_trakcie');
  });

  it('button is disabled when no handler provided', () => {
    render(<StatusBadge status="oczekuje" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
