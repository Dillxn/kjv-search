import { Verse, VersePairing } from '../types/verse';
import { RegexUtils } from '../shared/regex-utils';

interface OrderedTerms {
  first: string;
  second: string;
}

interface TermPosition {
  versePosition: number;
  verseOrder: number;
  charIndex: number;
}

function findEarliestTermPosition(term: string, verses: Verse[]): TermPosition | null {
  let earliest: TermPosition | null = null;

  verses.forEach((verse, verseOrder) => {
    if (!verse?.text) {
      return;
    }

    const matches = RegexUtils.findMatches(verse.text, term);
    if (matches.length === 0) {
      return;
    }

    const firstMatch = matches[0];
    const candidate: TermPosition = {
      versePosition: verse.position,
      verseOrder,
      charIndex: firstMatch.start,
    };

    if (!earliest) {
      earliest = candidate;
      return;
    }

    if (candidate.versePosition < earliest.versePosition) {
      earliest = candidate;
      return;
    }

    if (candidate.versePosition === earliest.versePosition && candidate.charIndex < earliest.charIndex) {
      earliest = candidate;
    }
  });

  return earliest;
}

function getOrderedTerms(pairing: VersePairing): OrderedTerms {
  const { term1, term2 } = pairing;

  if (term1 === term2) {
    return { first: term1, second: term2 };
  }

  const term1Position = findEarliestTermPosition(term1, pairing.verses);
  const term2Position = findEarliestTermPosition(term2, pairing.verses);

  if (term1Position && term2Position) {
    if (term1Position.versePosition < term2Position.versePosition) {
      return { first: term1, second: term2 };
    }

    if (term2Position.versePosition < term1Position.versePosition) {
      return { first: term2, second: term1 };
    }

    if (term1Position.charIndex <= term2Position.charIndex) {
      return { first: term1, second: term2 };
    }

    return { first: term2, second: term1 };
  }

  if (term1Position) {
    return { first: term1, second: term2 };
  }

  if (term2Position) {
    return { first: term2, second: term1 };
  }

  return term1.localeCompare(term2, undefined, { sensitivity: 'base' }) <= 0
    ? { first: term1, second: term2 }
    : { first: term2, second: term1 };
}

export function getConnectionReference(pairing: VersePairing): string {
  if (!pairing.verses || pairing.verses.length === 0) {
    return '';
  }

  if (pairing.verses.length === 1) {
    return pairing.verses[0].reference;
  }

  const [firstVerse, secondVerse] = pairing.verses;
  return `${firstVerse.reference} & ${secondVerse.reference}`;
}

export function getConnectionKey(pairing: VersePairing): string {
  const ordered = getOrderedTerms(pairing);
  const reference = getConnectionReference(pairing);
  return `${ordered.first}-${ordered.second}-${reference}`;
}

export function convertPairingToConnection(pairing: VersePairing): {
  word1: string;
  word2: string;
  reference: string;
  versePositions: number[];
} {
  const ordered = getOrderedTerms(pairing);
  const reference = getConnectionReference(pairing);

  return {
    word1: ordered.first,
    word2: ordered.second,
    reference,
    versePositions: pairing.verses.map((v) => v.position),
  };
}
