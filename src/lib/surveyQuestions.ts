export type QuestionType = 'text' | 'textarea' | 'select';

export interface SurveyQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
}

export interface SurveySection {
  title: string;
  key: string;
  questions: SurveyQuestion[];
}

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    title: 'Profil',
    key: 'profil',
    questions: [
      { key: 'imie', label: 'Imię lub pseudonim (opcjonalne)', type: 'text' },
      { key: 'lata_w_branzy', label: 'Ile lat pracujesz w branży rowerowej?', type: 'text' },
      { key: 'dlaczego_rowery', label: 'Co sprawiło, że zacząłeś/aś pracować z rowerami?', type: 'textarea' },
    ],
  },
  {
    title: 'Historia z Dr Koło',
    key: 'historia',
    questions: [
      { key: 'jak_trafil', label: 'Kiedy i jak trafiłeś/aś do serwisu Dr Koło?', type: 'textarea' },
      { key: 'zaskoczenie', label: 'Co cię zaskoczyło na początku pracy tutaj?', type: 'textarea' },
      { key: 'najciekawsze_zlecenie', label: 'Jakie zlecenie najbardziej zapamiętałeś/aś i dlaczego?', type: 'textarea' },
      { key: 'co_sie_zmienilo', label: 'Co się zmieniło w serwisie od kiedy tu pracujesz?', type: 'textarea' },
    ],
  },
  {
    title: 'Warsztat — przestrzeń i klimat',
    key: 'warsztat',
    questions: [
      { key: 'opis_warsztatu', label: 'Jak opisałbyś/aś warsztat Dr Koło komuś kto nigdy tu nie był?', type: 'textarea' },
      { key: 'duma', label: 'Z czego jesteś najbardziej dumny/a jeśli chodzi o wyposażenie lub organizację warsztatu?', type: 'textarea' },
      { key: 'co_dodalbys', label: 'Co byś dodał/a lub zmienił/a gdybyś mógł/mogła?', type: 'textarea' },
      { key: 'typowy_dzien', label: 'Jak wygląda twój typowy dzień pracy?', type: 'textarea' },
    ],
  },
  {
    title: 'Narzędzia i sprzęt',
    key: 'narzedzia',
    questions: [
      { key: 'ulubione_narzedzie', label: 'Jakie jest twoje ulubione narzędzie i dlaczego?', type: 'textarea' },
      { key: 'nie_oddam', label: 'Którego narzędzia lub urządzenia nie oddałbyś/abyś za nic?', type: 'textarea' },
      { key: 'niezbednik', label: 'Co uważasz za absolutny niezbędnik każdego serwisanta?', type: 'textarea' },
      { key: 'marki_narzedzi', label: 'Których marek narzędzi używasz najchętniej?', type: 'text' },
    ],
  },
  {
    title: 'Naprawy i specjalizacja',
    key: 'naprawy',
    questions: [
      { key: 'co_lubisz_naprawiac', label: 'Co naprawiasz najchętniej i w czym czujesz się najlepiej?', type: 'textarea' },
      { key: 'z_czego_znany', label: 'Z czego jesteś znany/a wśród współpracowników?', type: 'textarea' },
      { key: 'czeste_usterki', label: 'Jakie usterki klienci przynoszą najczęściej?', type: 'textarea' },
      { key: 'pierwsza_naprawa', label: 'Jaką naprawę zrobiłeś/aś ostatnio po raz pierwszy?', type: 'textarea' },
    ],
  },
  {
    title: 'Twój rower',
    key: 'rower',
    questions: [
      { key: 'co_jezdzisz', label: 'Co jeździsz prywatnie? (marka, model, rok)', type: 'text' },
      { key: 'pierwsza_zmiana', label: 'Co jako pierwsze zmieniłeś/aś lub ulepszyłeś/aś w swoim rowerze?', type: 'textarea' },
      { key: 'konfiguracja', label: 'Jak skonfigurowałeś/aś swój rower (geometria, osprzęt)?', type: 'textarea' },
      { key: 'rower_marzen', label: 'Jaki jest twój rower marzeń?', type: 'text' },
    ],
  },
  {
    title: 'Styl jazdy i trasy',
    key: 'styl',
    questions: [
      {
        key: 'typ_jazdy',
        label: 'Jaki typ jazdy preferujesz?',
        type: 'select',
        options: ['MTB', 'Szosa', 'Gravel', 'Trekking', 'Inne'],
      },
      { key: 'czestotliwosc', label: 'Jak często jeździsz prywatnie?', type: 'text' },
      { key: 'ulubiona_trasa', label: 'Jaka jest twoja ulubiona trasa w okolicach Gdańska lub Kartuz?', type: 'textarea' },
      { key: 'z_kim', label: 'Z kim najchętniej jeździsz?', type: 'text' },
    ],
  },
  {
    title: 'Wiedza i filozofia',
    key: 'filozofia',
    questions: [
      { key: 'polecane_marki', label: 'Jakie marki rowerów polecasz klientom i dlaczego?', type: 'textarea' },
      { key: 'polecane_komponenty', label: 'Jakie komponenty lub akcesoria polecasz najczęściej?', type: 'textarea' },
      { key: 'najwazniejsze', label: 'Co uważasz za najważniejszą rzecz w serwisowaniu roweru?', type: 'textarea' },
      { key: 'zdanie_dla_klienta', label: 'Jedno zdanie które chciałbyś/abyś powiedzieć każdemu nowemu klientowi Dr Koło.', type: 'textarea' },
    ],
  },
];
