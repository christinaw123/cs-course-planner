import { useState, useRef } from 'react';
import { SEM_POOL, getPastSemsForYear, semLong } from '../constants/semesters';
import { TAG_SHORT, TAG_CLASS, TAG_AUTO, COURSE_TITLE } from '../constants/tags';
import { BLOCK_COLORS, nextColor } from '../constants/colors';
import { normCode } from '../utils/courseUtils';
import { extractTextFromPDF, parseTranscriptText, enrichParsedCourses } from '../utils/parseTranscript';

const TRACK_OPTS = [
  { id: 'Basic', desc: '9 CS core, 2–5 math' },
  { id: 'Honors', desc: '11 CS core, AI tag required' },
  { id: 'Joint', desc: '8 CS core + thesis' },
  { id: 'MBB', desc: '8 CS core + 3 MBB courses' },
];

const CURRENT_YEAR = new Date().getFullYear();

function semFromDate() {
  const now = new Date();
  return (now.getMonth() + 1) >= 8
    ? `f${String(now.getFullYear()).slice(-2)}`
    : `s${String(now.getFullYear()).slice(-2)}`;
}

function yearFromGrad(gradYear) {
  const now = new Date();
  const isFall = (now.getMonth() + 1) >= 8;
  const diff = parseInt(gradYear) - now.getFullYear();
  if (isFall) {
    if (diff <= 1) return 'Senior';
    if (diff === 2) return 'Junior';
    if (diff === 3) return 'Sophomore';
    return 'Freshman';
  } else {
    if (diff <= 0) return 'Senior';
    if (diff === 1) return 'Junior';
    if (diff === 2) return 'Sophomore';
    return 'Freshman';
  }
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [gradYear, setGradYear] = useState('');
  const [track, setTrack] = useState('');
  const [err1, setErr1] = useState(false);
  const [err2, setErr2] = useState(false);

  const [pastCourses, setPastCourses] = useState({});
  const [pdfState, setPdfState] = useState(null); // null | 'parsing' | { parsed } | 'error'
  const [appliedBanner, setAppliedBanner] = useState(null); // { count, sems }
  const inputRefs = useRef({});
  const fileInputRef = useRef(null);

  const semId = semFromDate();
  const year = gradYear ? yearFromGrad(gradYear) : '';

  const pastSemIds = semId && year && year !== 'Freshman'
    ? getPastSemsForYear(year, semId)
    : [];

  function goStep2() {
    const g = parseInt(gradYear);
    if (!gradYear || isNaN(g) || g < CURRENT_YEAR || g > CURRENT_YEAR + 6) {
      setErr1(true);
      return;
    }
    setErr1(false);
    setStep(2);
  }

  function goStep3() {
    if (!track) { setErr2(true); return; }
    setErr2(false);
    setStep(3);
  }

  function goStep4() {
    if (year === 'Freshman') { finish(); return; }
    setStep(4);
  }

  function finish() {
    const plan = {};
    Object.entries(pastCourses).forEach(([sid, courses]) => {
      if (courses.length > 0) plan[sid] = courses;
    });

    onComplete({
      year,
      currentSemester: semId,
      gradYear: gradYear ? parseInt(gradYear) : null,
      track,
      onboardingDone: true,
      multiScheduleEnabled: true,
      plan,
    });
  }

  function addPastCourse(sid) {
    const inputEl = inputRefs.current[sid];
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (!raw) return;
    const code = normCode(raw.toUpperCase());
    const tags = TAG_AUTO[code] || [];
    const title = COURSE_TITLE[code] || code;
    const existing = pastCourses[sid] || [];
    const usedColors = existing.map(c => c.colorIdx ?? 0);
    const colorIdx = nextColor(usedColors);
    setPastCourses(prev => ({
      ...prev,
      [sid]: [...(prev[sid] || []), { code, title, tags, colorIdx, color: BLOCK_COLORS[colorIdx], isCustom: false, isTransfer: false }],
    }));
    inputEl.value = '';
    inputEl.focus();
  }

  async function handleTranscriptUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfState('parsing');
    try {
      const text = await extractTextFromPDF(file);
      const raw = parseTranscriptText(text);
      const parsed = enrichParsedCourses(raw);
      const total = Object.values(parsed).reduce((n, cs) => n + cs.length, 0);
      setPdfState(total > 0 ? { parsed } : { parsed: {}, empty: true });
    } catch {
      setPdfState('error');
    }
    // Reset file input so the same file can be re-selected if needed
    e.target.value = '';
  }

  function applyParsedCourses() {
    if (!pdfState?.parsed) return;
    let addedCount = 0;
    const addedSems = [];
    setPastCourses(prev => {
      const next = { ...prev };
      for (const [sid, courses] of Object.entries(pdfState.parsed)) {
        const existing = next[sid] || [];
        const existingCodes = new Set(existing.map(c => c.code));
        const newCourses = courses.filter(c => !existingCodes.has(c.code));
        if (newCourses.length) {
          next[sid] = [...existing, ...newCourses];
          addedCount += newCourses.length;
          addedSems.push(sid);
        }
      }
      return next;
    });
    setAppliedBanner({ count: addedCount, sems: addedSems.length });
    setPdfState(null);
  }

  function removePastCourse(sid, idx) {
    setPastCourses(prev => ({
      ...prev,
      [sid]: (prev[sid] || []).filter((_, i) => i !== idx),
    }));
  }

  const totalDots = year !== 'Freshman' ? 4 : 3;
  const skipDefaults = { year: 'Junior', currentSemester: semId, track: 'Honors', onboardingDone: true, plan: {} };

  return (
    <div className="ob-screen">
      {step === 1 && (
        <div className="ob-card">
          <div className="ob-stripe" />
          <div className="ob-body">
            <div className="ob-logo">CS Planner</div>
            <div className="step-dots">
              <div className="dot active" />
              <div className="dot" />
              <div className="dot" />
            </div>
            <div className="ob-title">When do you graduate?</div>
            <div className="ob-sub">Enter your expected graduation year to set up your plan.</div>
            <div className="ob-field">
              <label>Graduating class year</label>
              <input
                type="number"
                placeholder={`e.g. ${CURRENT_YEAR + 1}`}
                value={gradYear}
                min={CURRENT_YEAR}
                max={CURRENT_YEAR + 6}
                onChange={e => setGradYear(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') goStep2(); }}
                style={{ width: '100%', fontSize: 14, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'var(--font)', outline: 'none' }}
              />
            </div>
            {gradYear && year && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                You are currently a <strong style={{ color: 'var(--text1)' }}>{year}</strong> in <strong style={{ color: 'var(--text1)' }}>{semLong(semId)}</strong>.
              </div>
            )}
            {err1 && <div className="err-msg">Please enter a valid graduation year ({CURRENT_YEAR}–{CURRENT_YEAR + 6}).</div>}
          </div>
          <div className="ob-footer">
            <button className="btn-primary" onClick={goStep2}>Continue</button>
            <button className="skip-link" onClick={() => onComplete(skipDefaults)}>Skip for now</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="ob-card">
          <div className="ob-stripe" />
          <div className="ob-body">
            <div className="ob-logo">CS Planner</div>
            <div className="step-dots">
              <div className="dot done" />
              <div className="dot active" />
              <div className="dot" />
            </div>
            <div className="ob-title">Which concentration track?</div>
            <div className="ob-sub">This determines your requirement structure. You can switch tracks at any time.</div>
            <div className="track-grid">
              {TRACK_OPTS.map(t => (
                <div
                  key={t.id}
                  className={`track-opt${track === t.id ? ' selected' : ''}`}
                  onClick={() => setTrack(t.id)}
                >
                  <div className="track-opt-name">{t.id}</div>
                  <div className="track-opt-desc">{t.desc}</div>
                </div>
              ))}
            </div>
            {err2 && <div className="err-msg">Please select a track.</div>}
          </div>
          <div className="ob-footer">
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={goStep3}>Continue</button>
            <button className="skip-link" onClick={() => onComplete(skipDefaults)}>Skip for now</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="ob-card">
          <div className="ob-stripe" />
          <div className="ob-body">
            <div className="ob-logo">CS Planner</div>
            <div className="step-dots">
              <div className="dot done" />
              <div className="dot done" />
              <div className="dot active" />
              {totalDots === 4 && <div className="dot" />}
            </div>
            <div className="ob-title">Confirm your setup</div>
            <div className="ob-sub">Everything is editable later from Settings.</div>
            <div style={{ marginTop: 8 }}>
              <div className="ob-summary-row">
                <span className="ob-summary-label">Year</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ob-summary-val">{year}</span>
                  <button className="ob-summary-edit" onClick={() => setStep(1)}>Edit</button>
                </div>
              </div>
              <div className="ob-summary-row">
                <span className="ob-summary-label">Current semester</span>
                <span className="ob-summary-val">{semLong(semId)}</span>
              </div>
              <div className="ob-summary-row">
                <span className="ob-summary-label">Track</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ob-summary-val">{track}</span>
                  <button className="ob-summary-edit" onClick={() => setStep(2)}>Edit</button>
                </div>
              </div>
            </div>
          </div>
          <div className="ob-footer">
            <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" onClick={goStep4}>Continue</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="ob-card wide">
          <div className="ob-stripe" />
          <div className="ob-body scrollable">
            <div className="ob-logo">CS Planner</div>
            <div className="step-dots">
              <div className="dot done" />
              <div className="dot done" />
              <div className="dot done" />
              <div className="dot active" />
            </div>
            <div className="ob-title">Import your CS course history</div>
            <div className="ob-sub">Seed your history so requirements start partially satisfied. You can always add more later from the History tab.</div>

            {appliedBanner && (
              <div className="ob-transcript-applied">
                <span>✓ Added {appliedBanner.count} course{appliedBanner.count !== 1 ? 's' : ''} across {appliedBanner.sems} semester{appliedBanner.sems !== 1 ? 's' : ''} — check the list below.</span>
                <button onClick={() => setAppliedBanner(null)}>Got it</button>
              </div>
            )}

            {/* Transcript upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleTranscriptUpload}
            />

            {pdfState === null && (
              <button
                className="ob-transcript-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload transcript PDF
              </button>
            )}

            {pdfState === 'parsing' && (
              <div className="ob-transcript-status parsing">Parsing transcript…</div>
            )}

            {pdfState === 'error' && (
              <div className="ob-transcript-status error">
                Could not read the PDF. Try manual entry below.
                <button className="ob-transcript-retry" onClick={() => setPdfState(null)}>Dismiss</button>
              </div>
            )}

            {pdfState?.empty && (
              <div className="ob-transcript-status error">
                No CS or math courses found. Make sure it's a Harvard transcript.
                <button className="ob-transcript-retry" onClick={() => setPdfState(null)}>Dismiss</button>
              </div>
            )}

            {pdfState?.parsed && !pdfState.empty && (
              <div className="ob-transcript-preview">
                <div className="ob-transcript-preview-title">
                  Found {Object.values(pdfState.parsed).reduce((n, cs) => n + cs.length, 0)} course{Object.values(pdfState.parsed).reduce((n, cs) => n + cs.length, 0) !== 1 ? 's' : ''}
                </div>
                {Object.entries(pdfState.parsed).map(([sid, courses]) => (
                  <div key={sid} style={{ marginBottom: 6 }}>
                    <div className="ob-transcript-sem-label">{semLong(sid)}</div>
                    {courses.map(c => (
                      <div key={c.code} className="ob-transcript-course-row">
                        <div
                          className="ob-past-color-bar"
                          style={{ background: c.color.bg, border: `1px solid ${c.color.border}` }}
                        />
                        <span className="ob-past-code">{c.code}</span>
                        {c.tags.map(t => (
                          <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>{TAG_SHORT[t] || t}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="ob-transcript-preview-actions">
                  <button className="btn-primary" style={{ fontSize: 11, padding: '6px 14px' }} onClick={applyParsedCourses}>Use these courses</button>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 14px' }} onClick={() => setPdfState(null)}>Dismiss</button>
                </div>
              </div>
            )}

            {pastSemIds.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0' }}>No past semesters to show.</div>
            )}

            {pastSemIds.map(sid => {
              const courses = pastCourses[sid] || [];
              return (
                <div key={sid} className="ob-past-sem">
                  <div className="ob-past-sem-title">{semLong(sid)}</div>
                  {courses.map((c, i) => (
                    <div key={i} className="ob-past-course-row">
                      <div
                        className="ob-past-color-bar"
                        style={{ background: c.color.bg, border: `1px solid ${c.color.border}` }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="ob-past-code">{c.code}</div>
                        <div className="ob-past-tags">
                          {c.tags.map(t => (
                            <span key={t} className={`tag ${TAG_CLASS[t] || 'custom'}`}>
                              {TAG_SHORT[t] || t}
                            </span>
                          ))}
                          {c.tags.length === 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{c.title}</span>
                          )}
                        </div>
                      </div>
                      <button className="ob-past-rm" onClick={() => removePastCourse(sid, i)}>×</button>
                    </div>
                  ))}
                  <div className="ob-add-course-row">
                    <input
                      ref={el => inputRefs.current[sid] = el}
                      placeholder="Course code, e.g. CS 50"
                      onKeyDown={e => { if (e.key === 'Enter') addPastCourse(sid); }}
                    />
                    <button onClick={() => addPastCourse(sid)}>+ Add</button>
                  </div>
                </div>
              );
            })}

            <div className="ob-skip-note">Not sure? You can skip this and fill in your history later from the History tab.</div>
          </div>
          <div className="ob-footer">
            <button className="btn-ghost" onClick={() => setStep(3)}>Back</button>
            <button className="btn-primary" onClick={finish}>Get started</button>
            <button className="skip-link" onClick={finish}>Skip this step</button>
          </div>
        </div>
      )}
    </div>
  );
}
