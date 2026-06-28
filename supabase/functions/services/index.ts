import { json, methodNotAllowed, preflight } from "../_shared/http.ts";

const SERVICES = {
  categories: [
    {
      name: 'Przeglądy',
      services: [
        { name: 'Przegląd generalny Full Suspension', price_pln: 649 },
        { name: 'Przegląd generalny hardtail', price_pln: 449 },
        { name: 'Przegląd podstawowy', price_pln: 249 },
      ],
    },
    {
      name: 'Zawieszenie',
      services: [
        { name: 'Duży serwis zawieszenia', price_pln: 400 },
        { name: 'Mały serwis zawieszenia', price_pln: 200 },
      ],
    },
    {
      name: 'Napęd',
      services: [
        { name: 'Założenie łańcucha + regulacja przerzutki', price_pln: 80 },
        { name: 'Mycie napędu', price_pln: 80 },
        { name: 'Regulacja przerzutki', price_pln: 50 },
      ],
    },
    {
      name: 'Koła',
      services: [
        { name: 'Montaż systemu tubeless', price_pln: 150 },
        { name: 'Zmiana opony tubeless', price_pln: 50 },
        { name: 'Centrowanie koła', price_pln: 50 },
        { name: 'Dolanie uszczelniacza', price_pln: 40 },
        { name: 'Wymiana dętki', price_pln: 30 },
      ],
    },
    {
      name: 'Hamulce i diagnostyka',
      services: [
        { name: 'Diagnostyka Bosch', price_pln: 200 },
        { name: 'Serwis hamulca', price_pln: 50 },
        { name: 'Prostowanie haka przerzutki', price_pln: 30 },
      ],
    },
  ],
};

export async function handleServices(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflight();
  }

  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  return json(SERVICES);
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(handleServices);
}
