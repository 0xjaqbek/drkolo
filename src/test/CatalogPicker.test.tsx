import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogPicker } from '@/components/CatalogPicker';
import type { CatalogItem } from '@/lib/types';

const regularItems: CatalogItem[] = [
  { id: '1', category: 'Hamulce', label: 'Wymiana klocków — przód', is_package: false, parent_id: null, sort_order: 1 },
  { id: '2', category: 'Hamulce', label: 'Wymiana klocków — tył', is_package: false, parent_id: null, sort_order: 2 },
];

const packages: CatalogItem[] = [
  {
    id: 'p1',
    category: 'Pakiety',
    label: 'Przegląd podstawowy',
    is_package: true,
    parent_id: null,
    sort_order: 1,
    children: [
      { id: 'c1', category: 'Pakiety', label: 'Regulacja przerzutek', is_package: false, parent_id: 'p1', sort_order: 1 },
      { id: 'c2', category: 'Pakiety', label: 'Mycie łańcucha', is_package: false, parent_id: 'p1', sort_order: 2 },
    ],
  },
];

describe('CatalogPicker', () => {
  it('renders category headers', () => {
    render(<CatalogPicker regular={regularItems} packages={[]} onAddItems={vi.fn()} />);
    expect(screen.getByText('Hamulce')).toBeInTheDocument();
  });

  it('calls onAddItems with single item label when regular item clicked', () => {
    const onAdd = vi.fn();
    render(<CatalogPicker regular={regularItems} packages={[]} onAddItems={onAdd} />);
    fireEvent.click(screen.getByText('Hamulce'));
    fireEvent.click(screen.getByText('Wymiana klocków — przód'));
    expect(onAdd).toHaveBeenCalledWith(['Wymiana klocków — przód']);
  });

  it('renders Pakiety section when packages provided', () => {
    render(<CatalogPicker regular={[]} packages={packages} onAddItems={vi.fn()} />);
    expect(screen.getByText('Pakiety')).toBeInTheDocument();
  });

  it('calls onAddItems with all children labels when package clicked', () => {
    const onAdd = vi.fn();
    render(<CatalogPicker regular={[]} packages={packages} onAddItems={onAdd} />);
    fireEvent.click(screen.getByText('Pakiety'));
    fireEvent.click(screen.getByText(/Przegląd podstawowy/));
    expect(onAdd).toHaveBeenCalledWith(['Regulacja przerzutek', 'Mycie łańcucha']);
  });
});
