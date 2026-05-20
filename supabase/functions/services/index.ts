const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(JSON.stringify(SERVICES), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
