export type Language = 'en' | 'cs';

export type QueryExample = {
  query: string;
  meaning: string;
};

export type Dictionary = {
  common: {
    menuLabel: string;
    themeLabel: string;
    themeToggle: string;
    light: string;
    dark: string;
    languageLabel: string;
    english: string;
    czech: string;
    setEnglish: string;
    setCzech: string;
    yes: string;
    no: string;
  };
  game: {
    brand: string;
    title: string;
    intro: string;
    queryLabel: string;
    queryPlaceholder: string;
    resultsLabel: string;
    search: string;
    searching: string;
    showQueryManual: string;
    hideQueryManual: string;
    showingSummary: (shown: number, requested: number, query: string) => string;
    manual: {
      label: string;
      title: string;
      badge: string;
      coreTitle: string;
      advancedTitle: string;
      syntaxTitle: string;
      note: string;
      coreExamples: QueryExample[];
      advancedExamples: QueryExample[];
      syntaxCheatsheet: string[];
    };
    errorTitle: string;
    retry: string;
    loading: string;
    noPosts: string;
    noSelftext: string;
    debug: {
      title: string;
      appName: string;
      appVersion: string;
      archiveEnabled: string;
      archiveConfigSource: string;
      requestId: string;
      source: string;
      duration: string;
      milliseconds: string;
      receivedQuery: string;
      normalizedQuery: string;
      limit: string;
      upstreamStatus: string;
      upstreamCount: string;
      matchedLive: string;
      fallbackCount: string;
      archiveScanned: string;
      archiveMatched: string;
      archiveAdded: string;
      archivedUpserted: string;
      archiveLogs: string;
      fallbackTerms: string;
      error: string;
      archiveError: string;
      sourceValues: Record<
        'upstream' | 'fallback-empty' | 'fallback-upstream-error' | 'fallback-exception',
        string
      >;
      archiveConfigSourceValues: Record<'settings' | 'env' | 'mixed' | 'none', string>;
    };
    table: {
      titlePreview: string;
      score: string;
      comments: string;
      subreddit: string;
      age: string;
      actions: string;
      openOnReddit: string;
      viewMore: string;
      hide: string;
    };
    time: {
      minute: string;
      hour: string;
      day: string;
      ago: string;
    };
  };
  splash: {
    greeting: (username: string) => string;
    userFallback: string;
    snooAlt: string;
    editPrefix: string;
    editSuffix: string;
    start: string;
    docs: string;
    community: string;
    discord: string;
  };
};

export const translations: Record<Language, Dictionary> = {
  en: {
    common: {
      menuLabel: 'Display options',
      themeLabel: 'Theme',
      themeToggle: 'Toggle theme',
      light: 'Light',
      dark: 'Dark',
      languageLabel: 'Language',
      english: 'EN',
      czech: 'CS',
      setEnglish: 'Switch to English',
      setCzech: 'Switch to Czech',
      yes: 'yes',
      no: 'no',
    },
    game: {
      brand: 'Reddit API Demo',
      title: 'Listing-powered search',
      intro:
        'Enter query terms and choose how many results to retrieve. Results are collected server-side from multiple /r/all listings and rendered below in a table; full text is preloaded and revealed when you click "View more".',
      queryLabel: 'Query',
      queryPlaceholder: 'Example: "adhd tips" OR medication',
      resultsLabel: 'Results',
      search: 'Search',
      searching: 'Searching…',
      showQueryManual: 'View query manual',
      hideQueryManual: 'Hide query manual',
      showingSummary: (shown, requested, query) =>
        `Showing ${shown} of requested ${requested} for query: “${query}”`,
      manual: {
        label: 'Query Manual',
        title: 'Lucene-style Reddit search patterns',
        badge: 'Syntax quick reference',
        coreTitle: 'Core patterns supported in this app',
        advancedTitle: 'Advanced Lucene-style ideas',
        syntaxTitle: 'Syntax cheatsheet',
        note: `Note: this app's matcher currently fully supports term/phrase/OR behavior. Advanced patterns follow Reddit's Lucene-style conventions and may depend on Reddit-side indexing support.`,
        coreExamples: [
          { query: 'adhd therapy', meaning: 'Both terms are required (AND behavior).' },
          { query: '"adhd tips"', meaning: 'Exact phrase match.' },
          { query: 'adhd OR autism', meaning: 'At least one side must match.' },
          { query: '"adhd tips" OR medication', meaning: 'Phrase + OR term combination.' },
          { query: '(adhd OR add) medication', meaning: 'Grouped OR combined with another term.' },
          {
            query: 'title:adhd selftext:"sleep"',
            meaning: 'Field prefixes can be included in query text.',
          },
        ],
        advancedExamples: [
          {
            query: 'adhd NOT "self diagnosis"',
            meaning: 'Exclude phrase-level noise (native Reddit Lucene style).',
          },
          {
            query: 'title:"executive function" AND (planner OR routine)',
            meaning: 'Focused intent with grouped alternatives.',
          },
          {
            query: 'flair_name:"Research" adhd',
            meaning: 'Constrain by post metadata when Reddit indexing supports it.',
          },
          {
            query: 'subreddit:science "adhd" score:>100',
            meaning: 'Subreddit + score threshold filter.',
          },
          {
            query: 'created:2024-01-01..2026-03-18 adhd',
            meaning: 'Date range filtering in Lucene-style syntax.',
          },
          {
            query: '(sleep OR diet OR exercise) AND adhd AND -medication',
            meaning: 'Complex boolean query with term exclusion.',
          },
        ],
        syntaxCheatsheet: [
          '"exact phrase"',
          'term1 term2',
          'term1 OR term2',
          'term NOT other',
          'field:value',
          '(grouped clauses)',
        ],
      },
      errorTitle: "Couldn't reach Reddit search.",
      retry: 'Try again',
      loading: 'Searching Reddit posts…',
      noPosts: 'No posts were found for this query.',
      noSelftext: 'No selftext available.',
      debug: {
        title: 'Debug',
        appName: 'App',
        appVersion: 'App version',
        archiveEnabled: 'Archive enabled',
        archiveConfigSource: 'Archive config source',
        requestId: 'Request ID',
        source: 'Source',
        duration: 'Duration',
        milliseconds: 'ms',
        receivedQuery: 'Received query',
        normalizedQuery: 'Normalized query',
        limit: 'Limit',
        upstreamStatus: 'Upstream status',
        upstreamCount: 'Upstream count',
        matchedLive: 'Matched in live scan',
        fallbackCount: 'Fallback count',
        archiveScanned: 'Archive scanned',
        archiveMatched: 'Archive matched',
        archiveAdded: 'Archive added',
        archivedUpserted: 'Archived upserted',
        archiveLogs: 'Archive logs',
        fallbackTerms: 'Fallback terms',
        error: 'Error',
        archiveError: 'Archive error',
        sourceValues: {
          upstream: 'upstream',
          'fallback-empty': 'fallback-empty',
          'fallback-upstream-error': 'fallback-upstream-error',
          'fallback-exception': 'fallback-exception',
        },
        archiveConfigSourceValues: {
          settings: 'settings',
          env: 'env',
          mixed: 'mixed',
          none: 'none',
        },
      },
      table: {
        titlePreview: 'Title & preview',
        score: 'Score',
        comments: 'Comments',
        subreddit: 'Subreddit',
        age: 'Age',
        actions: 'Actions',
        openOnReddit: 'Open on Reddit',
        viewMore: 'View more',
        hide: 'Hide',
      },
      time: {
        minute: 'm',
        hour: 'h',
        day: 'd',
        ago: 'ago',
      },
    },
    splash: {
      greeting: (username) => `Hey ${username} 👋`,
      userFallback: 'user',
      snooAlt: 'Snoo',
      editPrefix: 'Edit',
      editSuffix: 'to get started.',
      start: 'Tap to Start',
      docs: 'Docs',
      community: 'r/Devvit',
      discord: 'Discord',
    },
  },
  cs: {
    common: {
      menuLabel: 'Nastavení zobrazení',
      themeLabel: 'Motiv',
      themeToggle: 'Přepnout motiv',
      light: 'Světlý',
      dark: 'Tmavý',
      languageLabel: 'Jazyk',
      english: 'EN',
      czech: 'CS',
      setEnglish: 'Přepnout do angličtiny',
      setCzech: 'Přepnout do češtiny',
      yes: 'ano',
      no: 'ne',
    },
    game: {
      brand: 'Demo Reddit API',
      title: 'Vyhledávání nad listingy',
      intro:
        'Zadejte dotaz a počet výsledků. Výsledky se sbírají na serveru z více listingů /r/all a zobrazují se níže v tabulce; celý text je načtený předem a rozbalí se po kliknutí na "Zobrazit více".',
      queryLabel: 'Dotaz',
      queryPlaceholder: 'Příklad: "adhd tips" OR medication',
      resultsLabel: 'Výsledky',
      search: 'Hledat',
      searching: 'Vyhledávám…',
      showQueryManual: 'Zobrazit manuál dotazů',
      hideQueryManual: 'Skrýt manuál dotazů',
      showingSummary: (shown, requested, query) =>
        `Zobrazeno ${shown} z požadovaných ${requested} pro dotaz: „${query}“`,
      manual: {
        label: 'Manuál dotazů',
        title: 'Vzory vyhledávání ve stylu Lucene',
        badge: 'Rychlý přehled syntaxe',
        coreTitle: 'Základní vzory podporované touto aplikací',
        advancedTitle: 'Pokročilé nápady ve stylu Lucene',
        syntaxTitle: 'Tahák syntaxe',
        note: `Poznámka: matcher v této aplikaci plně podporuje chování term/phrase/OR. Pokročilé vzory níže vycházejí z Reddit Lucene syntaxe a mohou záviset na indexaci na straně Redditu.`,
        coreExamples: [
          { query: 'adhd therapy', meaning: 'Oba termy musí být přítomné (chování AND).' },
          { query: '"adhd tips"', meaning: 'Přesná shoda fráze.' },
          { query: 'adhd OR autism', meaning: 'Musí sedět alespoň jedna strana.' },
          { query: '"adhd tips" OR medication', meaning: 'Kombinace fráze a OR termu.' },
          {
            query: '(adhd OR add) medication',
            meaning: 'Seskupené OR kombinované s dalším termem.',
          },
          {
            query: 'title:adhd selftext:"sleep"',
            meaning: 'Do dotazu lze zahrnout prefixy polí.',
          },
        ],
        advancedExamples: [
          {
            query: 'adhd NOT "self diagnosis"',
            meaning: 'Vyloučení šumu pomocí negace (nativní Reddit Lucene styl).',
          },
          {
            query: 'title:"executive function" AND (planner OR routine)',
            meaning: 'Přesnější záměr se seskupenými alternativami.',
          },
          {
            query: 'flair_name:"Research" adhd',
            meaning: 'Filtrování podle metadat příspěvku, pokud je Reddit indexuje.',
          },
          {
            query: 'subreddit:science "adhd" score:>100',
            meaning: 'Filtr podle subredditu a minimálního skóre.',
          },
          {
            query: 'created:2024-01-01..2026-03-18 adhd',
            meaning: 'Filtrace podle časového rozsahu.',
          },
          {
            query: '(sleep OR diet OR exercise) AND adhd AND -medication',
            meaning: 'Komplexní boolean dotaz s vyloučením termu.',
          },
        ],
        syntaxCheatsheet: [
          '"přesná fráze"',
          'term1 term2',
          'term1 OR term2',
          'term NOT other',
          'pole:hodnota',
          '(seskupené podmínky)',
        ],
      },
      errorTitle: 'Nepodařilo se spojit s vyhledáváním Redditu.',
      retry: 'Zkusit znovu',
      loading: 'Vyhledávám příspěvky na Redditu…',
      noPosts: 'Pro tento dotaz nebyly nalezeny žádné příspěvky.',
      noSelftext: 'Příspěvek nemá selftext.',
      debug: {
        title: 'Ladění',
        appName: 'Aplikace',
        appVersion: 'Verze aplikace',
        archiveEnabled: 'Archiv zapnut',
        archiveConfigSource: 'Zdroj konfigurace archivu',
        requestId: 'ID požadavku',
        source: 'Zdroj',
        duration: 'Trvání',
        milliseconds: 'ms',
        receivedQuery: 'Přijatý dotaz',
        normalizedQuery: 'Normalizovaný dotaz',
        limit: 'Limit',
        upstreamStatus: 'Upstream status',
        upstreamCount: 'Upstream počet',
        matchedLive: 'Shody v live skenu',
        fallbackCount: 'Fallback počet',
        archiveScanned: 'Archiv prohledán',
        archiveMatched: 'Archiv shody',
        archiveAdded: 'Archiv přidáno',
        archivedUpserted: 'Archiv upserted',
        archiveLogs: 'Logy archivu',
        fallbackTerms: 'Fallback termy',
        error: 'Chyba',
        archiveError: 'Chyba archivu',
        sourceValues: {
          upstream: 'upstream',
          'fallback-empty': 'fallback-prázdný',
          'fallback-upstream-error': 'fallback-upstream-chyba',
          'fallback-exception': 'fallback-výjimka',
        },
        archiveConfigSourceValues: {
          settings: 'settings',
          env: 'env',
          mixed: 'mixed',
          none: 'none',
        },
      },
      table: {
        titlePreview: 'Titulek a náhled',
        score: 'Skóre',
        comments: 'Komentáře',
        subreddit: 'Subreddit',
        age: 'Stáří',
        actions: 'Akce',
        openOnReddit: 'Otevřít na Redditu',
        viewMore: 'Zobrazit více',
        hide: 'Skrýt',
      },
      time: {
        minute: 'min',
        hour: 'h',
        day: 'd',
        ago: 'zpět',
      },
    },
    splash: {
      greeting: (username) => `Ahoj ${username} 👋`,
      userFallback: 'uživateli',
      snooAlt: 'Snoo',
      editPrefix: 'Uprav',
      editSuffix: 'a můžeš začít.',
      start: 'Spustit',
      docs: 'Dokumentace',
      community: 'r/Devvit',
      discord: 'Discord',
    },
  },
};
