import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Package } from 'lucide-react';
import type { CatalogItem } from '@/lib/types';

interface CatalogPickerProps {
  regular: CatalogItem[];
  packages: CatalogItem[];
  onAddItems: (labels: string[]) => void;
}

function groupByCategory(items: CatalogItem[]): Record<string, CatalogItem[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, CatalogItem[]>
  );
}

export function CatalogPicker({ regular, packages, onAddItems }: CatalogPickerProps) {
  const grouped = groupByCategory(regular);
  const categories = Object.keys(grouped).sort();

  return (
    <Accordion type="multiple" className="w-full border rounded-lg divide-y">
      {categories.map(category => (
        <AccordionItem key={category} value={category} className="border-none">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
            {category}
          </AccordionTrigger>
          <AccordionContent className="pb-1">
            {grouped[category].map(item => (
              <button
                key={item.id}
                className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-accent"
                onClick={() => onAddItems([item.label])}
              >
                <span>{item.label}</span>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}

      {packages.length > 0 && (
        <AccordionItem value="Pakiety" className="border-none">
          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
            Pakiety
          </AccordionTrigger>
          <AccordionContent className="pb-1">
            {packages.map(pkg => (
              <button
                key={pkg.id}
                className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-accent"
                onClick={() => onAddItems(pkg.children?.map(c => c.label) ?? [])}
              >
                <span>
                  {pkg.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    (pakiet → {pkg.children?.length ?? 0} pkt)
                  </span>
                </span>
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
