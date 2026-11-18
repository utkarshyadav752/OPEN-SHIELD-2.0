import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLegalText, type AnalysisReport } from '../documentAndUrlAnalyzer.ts';
import {
  buildSpokenReportScript,
  splitTextIntoUtteranceChunks,
  sortFindingsByRiskPriority,
  selectFindingsForMode,
  getPlaybackSpeedAriaLabel,
  buildPlaybackControlAriaLabels,
  getSectionPillAriaLabel,
  SUPPORTED_PLAYBACK_SPEEDS,
} from '../ttsReportBuilder.ts';

const SAMPLE_COMPLEX_RAW_TEXT = `Section 1. Annual Contract, Paid Monthly
Your Creative Cloud plan is billed at ₹1,675 per month under an annual commitment and your subscription will automatically renew each year unless you cancel before your annual renewal date.
Section 2. Cancellation & Early Termination Fee
Should you cancel after 14 days of your initial order, you will be billed a non-refundable early termination fee equal to 50% of your remaining annual contract obligation. All fees are non-refundable once the 14-day period expires.
Section 3. Free Trials & Add-On Conversions
Your 30-day Adobe Stock free trial will automatically convert to a paid monthly subscription of ₹2,399 per month unless cancelled before the trial ends. Optional protection and stock add-ons are pre-selected at checkout for convenience.
Section 4. Dispute Resolution & Arbitration
Any dispute or claim arising out of these terms shall be resolved through binding arbitration, and you waive any right to participate in a class action lawsuit.
Section 5. Modifications to Terms
We may modify these terms at any time without notice by posting revised terms on our website.`;

describe('OpenShield TTS Report Script Builder & Chunker', () => {
  it('splits long text into safe browser utterance chunks without losing words', () => {
    const longParagraph =
      'OpenShield Analysis Report for Adobe Creative Cloud. Overall risk assessment is High Concern with 6 total findings detected. ' +
      'Should you cancel after 14 days of your initial order, you will be billed a non-refundable early termination fee equal to 50 percent of your remaining annual contract obligation. ' +
      'Furthermore, any dispute arising out of these terms shall be resolved through binding arbitration and you waive any right to participate in a class action lawsuit.';

    const chunks = splitTextIntoUtteranceChunks(longParagraph, 180);
    assert.ok(chunks.length >= 3, 'Expected long paragraph to be split into at least 3 chunks');
    for (const chunk of chunks) {
      assert.ok(
        chunk.length <= 180,
        `Expected chunk length <= 180, got ${chunk.length}: "${chunk}"`
      );
    }
    assert.ok(chunks.join(' ').includes('50 percent of your remaining annual contract obligation'));
  });

  it('orders Critical and High risk findings ahead of Medium and Low risk without mutating original array', () => {
    const report = analyzeLegalText({
      rawText: SAMPLE_COMPLEX_RAW_TEXT,
      title: 'Adobe Terms Test',
      sourceType: 'url',
      sourceLabel: 'https://www.adobe.com/plans',
      pageCount: 1,
    });

    const originalOrderIds = report.findings.map((f) => f.id);
    const sorted = sortFindingsByRiskPriority(report.findings);

    // Ensure non-mutation
    assert.deepEqual(
      report.findings.map((f) => f.id),
      originalOrderIds
    );

    const priorityMap = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(
        priorityMap[sorted[i].riskLevel] >= priorityMap[sorted[i - 1].riskLevel],
        'Expected findings sorted in descending severity order'
      );
    }
  });

  it('builds a structured spoken script in Summary and Full Report modes without mutating report', () => {
    const report: AnalysisReport = analyzeLegalText({
      rawText: SAMPLE_COMPLEX_RAW_TEXT,
      title: 'Adobe Creative Cloud Subscription Terms',
      sourceType: 'url',
      sourceLabel: 'https://www.adobe.com/creativecloud/plans.html',
      pageCount: 1,
    });

    const snapshotBefore = JSON.stringify(report);

    const summaryScript = buildSpokenReportScript(report, { mode: 'summary', lang: 'en' });
    const fullScript = buildSpokenReportScript(report, { mode: 'full', lang: 'en' });

    // Verify original report was not mutated
    assert.equal(JSON.stringify(report), snapshotBefore);

    // First section is overview, last section is limitations/disclaimer
    assert.equal(summaryScript.sections[0].kind, 'overview');
    assert.ok(
      summaryScript.sections[0].fullSpokenText.includes('Overall risk assessment:'),
      'Expected overview section to announce overall risk'
    );

    const lastSection = summaryScript.sections[summaryScript.sections.length - 1];
    assert.equal(lastSection.kind, 'limitations');
    assert.ok(
      lastSection.fullSpokenText.toLowerCase().includes('not constitute definitive legal advice'),
      'Expected disclaimer to clarify findings are AI assessments and not legal advice'
    );

    // Full mode includes all findings
    const fullFindingSections = fullScript.sections.filter((s) => s.kind === 'finding');
    assert.equal(fullFindingSections.length, report.findings.length);

    // Every finding section carries its findingId for UI highlighting and speaks risk level in words
    for (const fSec of fullFindingSections) {
      assert.ok(fSec.findingId, 'Finding section must include findingId for UI highlighting');
      assert.ok(
        fSec.fullSpokenText.includes('Risk level:'),
        'Finding section must speak risk level in words'
      );
      assert.ok(
        fSec.utteranceChunks.length >= 1,
        'Finding section must contain at least one utterance chunk'
      );
    }
  });

  it('supports Hindi spoken script generation', () => {
    const report = analyzeLegalText({
      rawText: SAMPLE_COMPLEX_RAW_TEXT,
      title: 'Adobe Plan Terms',
      sourceType: 'text',
      sourceLabel: 'Pasted Text',
      pageCount: 1,
    });

    const hiScript = buildSpokenReportScript(report, { mode: 'summary', lang: 'hi' });
    assert.equal(hiScript.lang, 'hi');
    assert.ok(hiScript.sections[0].fullSpokenText.includes('OpenShield विश्लेषण रिपोर्ट'));
  });

  it('generates descriptive aria-labels for play, pause, resume, and speed selection states', () => {
    // 1. Speed selection states
    for (const spd of SUPPORTED_PLAYBACK_SPEEDS) {
      const labelWhen125Active = getPlaybackSpeedAriaLabel(spd, 1.25, 'en');
      if (spd === 1.25) {
        assert.equal(labelWhen125Active, 'Playback speed 1.25x, selected');
      } else {
        assert.equal(
          labelWhen125Active,
          `Set playback speed to ${spd}x (current speed 1.25x)`
        );
      }
    }

    // 2. Idle / Play state
    const idleLabels = buildPlaybackControlAriaLabels({
      status: 'idle',
      mode: 'summary',
      speed: 1,
      lang: 'en',
      currentSectionIdx: 0,
      totalSections: 6,
      activeSectionLabel: '1. Overall Risk Summary',
      totalFindings: 8,
      isExpanded: true,
      showVoiceSettings: false,
      autoScrollEnabled: true,
    });
    assert.ok(idleLabels.primaryListenBtn.includes('Listen to Results'));
    assert.ok(idleLabels.playBtn.includes('Play analysis aloud'));
    assert.ok(idleLabels.playBtn.includes('Section 1 of 6 (1. Overall Risk Summary) at 1x speed'));
    assert.equal(idleLabels.modeSummaryBtn, 'Spoken Summary mode, selected');
    assert.equal(idleLabels.modeFullBtn, 'Switch to Listen to Full Report mode (8 findings)');

    // 3. Playing / Pause state at 1.5x speed
    const playingLabels = buildPlaybackControlAriaLabels({
      status: 'playing',
      mode: 'full',
      speed: 1.5,
      lang: 'en',
      currentSectionIdx: 1,
      totalSections: 10,
      activeSectionLabel: 'Finding 1 (Critical Risk): Early Termination Fee',
      totalFindings: 8,
      isExpanded: true,
      showVoiceSettings: true,
      autoScrollEnabled: true,
      selectedVoiceName: 'Google US English (en-US)',
    });
    assert.ok(playingLabels.primaryListenBtn.includes('Pause reading analysis results'));
    assert.ok(playingLabels.pauseBtn.includes('Pause playback'));
    assert.ok(playingLabels.pauseBtn.includes('Section 2 of 10'));
    assert.ok(playingLabels.pauseBtn.includes('1.5x speed'));
    assert.equal(playingLabels.speedGroup, 'Playback speed selection, current speed 1.5x selected');
    assert.equal(playingLabels.modeFullBtn, 'Listen to Full Report mode (8 findings), selected');

    // 4. Paused / Resume state
    const pausedLabels = buildPlaybackControlAriaLabels({
      status: 'paused',
      mode: 'summary',
      speed: 1.25,
      lang: 'en',
      currentSectionIdx: 2,
      totalSections: 6,
      activeSectionLabel: 'Finding 2 (High Risk): Auto-Renewal',
      totalFindings: 8,
      isExpanded: true,
      showVoiceSettings: false,
      autoScrollEnabled: false,
    });
    assert.ok(pausedLabels.primaryListenBtn.includes('Resume reading analysis results'));
    assert.ok(pausedLabels.resumeBtn.includes('Resume playback — paused at Section 3 of 6'));
    assert.ok(pausedLabels.resumeBtn.includes('1.25x speed'));

    // 5. Section jump pill labels
    const activePillLabel = getSectionPillAriaLabel({
      sectionIndex: 1,
      totalSections: 6,
      sectionLabel: 'Finding 1 (Critical Risk): Early Termination Fee',
      isCurrent: true,
      status: 'playing',
      lang: 'en',
    });
    assert.ok(activePillLabel.includes('Jump to Section 2 of 6'));
    assert.ok(activePillLabel.includes('currently playing'));
  });
});

