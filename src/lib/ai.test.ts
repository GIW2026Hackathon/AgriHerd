import { describe, expect, it } from 'vitest';
import { farmerExplanation, screenDescription, symptomsFromDescription } from './ai';

describe('farmer AI intake', () => {
  it('recognises common Swahili descriptions', () => {
    expect(symptomsFromDescription('Ng’ombe ana homa kali, hakuli na kupe wameonekana')).toEqual(
      expect.arrayContaining(['high_fever', 'anorexia', 'ticks_observed']),
    );
  });

  it('combines manually selected and described symptoms', () => {
    const screened = screenDescription('Anapumua kwa shida na anakohoa', ['ticks_observed']);
    expect(screened.symptoms).toEqual(expect.arrayContaining(['ticks_observed', 'dyspnoea', 'cough']));
    expect(screened.result.differential.length).toBeGreaterThan(0);
  });

  it('always gives a safe Swahili explanation', () => {
    const screened = screenDescription('Ng’ombe amelala hawezi kusimama');
    expect(screened.result.urgency).toBe('emergency');
    expect(farmerExplanation(screened.result, 'sw')).toContain('dharura');
  });
});
