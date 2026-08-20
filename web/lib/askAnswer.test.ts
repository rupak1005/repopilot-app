import { describe, expect, it } from 'vitest';
import { sanitizeAskAnswer } from './askAnswer';

describe('sanitizeAskAnswer', () => {
  it('strips inline file citation markers', () => {
    expect(
      sanitizeAskAnswer(
        'See Waitlist [file=src/components/Waitlist.jsx, lines=[97,136]] for the modal.'
      )
    ).toBe('See Waitlist for the modal.');
  });

  it('normalizes triple-star emphasis to bold markers', () => {
    expect(sanitizeAskAnswer('***Waitlist component*** handles signup.')).toBe(
      '**Waitlist component** handles signup.'
    );
  });
});
