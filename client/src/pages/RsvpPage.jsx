import { useState, useEffect } from 'react';
import { lookupGuest, submitRsvp, pingHealth } from '../api';

export default function RsvpPage() {
  const [view, setView] = useState('form'); // 'form' | 'thankyou' | 'declined'
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameErr, setFirstNameErr] = useState('');
  const [lastNameErr, setLastNameErr] = useState('');
  const [notFoundErr, setNotFoundErr] = useState('');

  // Current guest + party state
  const [currentGuest, setCurrentGuest] = useState(null);
  const [allPartyMembers, setAllPartyMembers] = useState([]); // everyone in the party inc. self
  const [partyQueue, setPartyQueue] = useState([]);           // members still to RSVP

  // Step 2 form fields
  const [attending, setAttending] = useState('');
  const [dietary, setDietary] = useState('');
  const [plusOne, setPlusOne] = useState('');
  const [plusOneName, setPlusOneName] = useState('');
  const [children, setChildren] = useState('');
  const [childNames, setChildNames] = useState('');
  const [attendingErr, setAttendingErr] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [serverReady, setServerReady] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);

  // Wake up Render free tier on page load
  useEffect(() => {
    let warmupTimer;
    let done = false;
    warmupTimer = setTimeout(() => { if (!done) setShowWarmup(true); }, 3000);
    pingHealth()
      .finally(() => {
        done = true;
        clearTimeout(warmupTimer);
        setShowWarmup(false);
        setServerReady(true);
      });
    return () => clearTimeout(warmupTimer);
  }, []);


  function resetRsvpForm() {
    setAttending(''); setDietary(''); setPlusOne(''); setPlusOneName('');
    setChildren(''); setChildNames(''); setAttendingErr(''); setSubmitErr('');
  }

  async function handleStep1() {
    setFirstNameErr(''); setLastNameErr(''); setNotFoundErr('');
    let valid = true;
    if (!firstName.trim()) { setFirstNameErr('Please enter your first name.'); valid = false; }
    if (!lastName.trim())  { setLastNameErr('Please enter your last name.'); valid = false; }
    if (!valid) return;

    const res = await lookupGuest(firstName.trim(), lastName.trim());
    if (!res.found) {
      setNotFoundErr("We couldn't find your name on the guest list. Please double-check your spelling or contact us.");
      return;
    }
    if (res.alreadyRsvped) {
      setView(res.priorAttending === 'no' ? 'declined' : 'thankyou');
      return;
    }

    setCurrentGuest(res.guest);
    resetRsvpForm();

    if (res.partyMembers && res.partyMembers.length > 0) {
      setAllPartyMembers([res.guest, ...res.partyMembers]);
      setPartyQueue(res.partyMembers.filter(m => !m.alreadyRsvped));
    } else {
      setAllPartyMembers([]);
      setPartyQueue([]);
    }

    setStep(2);
  }

  async function handleNextPartyMember() {
    setAttendingErr(''); setSubmitErr('');
    if (!attending) { setAttendingErr('Please select an option.'); return; }

    setSubmitting(true);
    try {
      await submitRsvp({
        name: `${currentGuest.firstName} ${currentGuest.lastName}`,
        attending, dietary, plusOne,
        plusOneName: plusOne === 'yes' ? plusOneName : '',
        children,
        childNames: children === 'yes' ? childNames : '',
      });
      const [next, ...remaining] = partyQueue;
      setPartyQueue(remaining);
      setCurrentGuest(next);
      setAllPartyMembers(prev => prev.map(m =>
        m.id === currentGuest.id ? { ...m, alreadyRsvped: true } : m
      ));
      resetRsvpForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setAttendingErr(''); setSubmitErr('');
    if (!attending) { setAttendingErr('Please select an option.'); return; }

    setSubmitting(true);
    try {
      await submitRsvp({
        name: `${currentGuest.firstName} ${currentGuest.lastName}`,
        attending, dietary, plusOne,
        plusOneName: plusOne === 'yes' ? plusOneName : '',
        children,
        childNames: children === 'yes' ? childNames : '',
      });
      setView(attending === 'yes' ? 'thankyou' : 'declined');
    } catch {
      setSubmitErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'thankyou') {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;TZID=America/Los_Angeles:20260606T190000',
      'DTEND;TZID=America/Los_Angeles:20260606T220000',
      'SUMMARY:Kioko Grad Party',
      'LOCATION:2865 Eastlake Ave E\\, Seattle\\, WA 98102',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const appleCalHref = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);

    return (
      <div className="page">
        <Confetti />
        <header className="site-header">
          <h1>Excited to Celebrate<br />with You</h1>
          <div className="divider">
            <svg className="illustrated-marg" viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="currentColor" d="M 4,8 C 4,18 12,26 14,26 L 26,26 C 28,26 36,18 36,8 Z"/>
              <rect fill="currentColor" x="18" y="26" width="4" height="10" rx="1"/>
              <rect fill="currentColor" x="9" y="39" width="22" height="3" rx="1.5"/>
              <path fill="#4caf50" d="M 28,8 A 6,6 0 0,1 40,8 Z"/>
            </svg>
          </div>
          <p className="subtitle">june 6th, 2026</p>
        </header>
        <div className="view active">
          <div className="card">
            <div className="thankyou-screen">
              <p className="thankyou-intro">Thank you for your RSVP! We'll be hosting you at:</p>
              <div className="venue-block">
                <p className="venue-name">Little Water Cantina</p>
                <p className="venue-hours">7pm – 10pm</p>
                <p className="venue-address">2865 Eastlake Ave E<br />Seattle, WA 98102</p>
                <p className="parking-note">
                  Learn more about parking and general information{' '}
                  <a href="https://littlewatercantina.com/general-info/" target="_blank" rel="noopener noreferrer">here</a>.
                </p>
              </div>
              <p className="reminder-heading" style={{marginTop: 24}}>Directions</p>
              <div className="map-buttons">
                <a
                  href="https://maps.apple.com/place?place-id=I7DDEF211FEDAA288&address=2865+Eastlake+Ave+E%2C+Seattle%2C+WA+98102%2C+United+States&coordinate=47.647205%2C-122.324964&name=Little+Water+Cantina&_provider=9902"
                  className="btn btn-map"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple Maps
                </a>
                <a
                  href="https://www.google.com/maps/place/Little+Water+Cantina/@47.6472222,-122.3271887,17z/data=!4m15!1m8!3m7!1s0x549014e4908bc33b:0x76e504ccc533b80c!2s2865+Eastlake+Ave+E,+Seattle,+WA+98102!3b1!8m2!3d47.6472203!4d-122.3249937!16s%2Fg%2F11b8y_gjx5!3m5!1s0x549014e48fd8d2bb:0xb2f5de3ee04abfc5!8m2!3d47.6472222!4d-122.325!16s%2Fg%2F1tjl5lzn!5m1!1e1?entry=ttu&g_ep=EgoyMDI2MDMwNC4xIKXMDSoASAFQAw%3D%3D"
                  className="btn btn-map"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Maps
                </a>
              </div>
              <div className="reminder-section">
                <p className="reminder-heading">Get a Reminder</p>
                <div className="reminder-buttons">
                  <a
                    href={appleCalHref}
                    className="btn btn-reminder"
                    download="kioko-grad-party.ics"
                  >
                    Apple Calendar
                  </a>
                  <a
                    href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Kioko+Grad+Party&dates=20260606T190000/20260606T220000&ctz=America/Los_Angeles&location=2865+Eastlake+Ave+E,+Seattle,+WA+98102"
                    className="btn btn-reminder"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Calendar
                  </a>
                </div>
              </div>
              <p className="save-url-note">Save this URL in case you need to log back in for the RSVP info!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'declined') {
    return (
      <div className="page">
        <Header />
        <div className="view active">
          <div className="card">
            <div className="success-screen">
              <h2>We'll miss you!</h2>
              <p>Thank you for letting us know. We hope to see you another time.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Party member names to show in the banner (everyone in the party except the current guest)
  const partyOthers = allPartyMembers.filter(m => m.id !== currentGuest?.id);

  return (
    <div className="page">
      {showWarmup && (
        <div className="warmup-overlay">
          <div className="warmup-box">
            <p className="warmup-title">Getting the party started…</p>
            <p className="warmup-sub">The server is waking up. This takes about 30–60 seconds on first visit. Hang tight!</p>
            <div className="warmup-bar-track">
              <div className="warmup-bar-fill" />
            </div>
          </div>
        </div>
      )}
      <Header />
      <div className="view active">
        <div className="card">
          <div className="step-indicator">
            <div className={`step-dot ${step === 1 ? 'active' : 'done'}`}>{step === 1 ? '1' : '✓'}</div>
            <div className={`step-line ${step === 2 ? 'done' : ''}`}></div>
            <div className={`step-dot ${step === 2 ? 'active' : ''}`}>2</div>
          </div>

          {step === 1 && (
            <div>
              <div className="form-group">
                <label htmlFor="guestFirstName">First Name</label>
                <input type="text" id="guestFirstName" placeholder="Your first name" autoComplete="given-name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
                {firstNameErr && <div className="field-error">{firstNameErr}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="guestLastName">Last Name</label>
                <input type="text" id="guestLastName" placeholder="Your last name" autoComplete="family-name"
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStep1()} />
                {lastNameErr && <div className="field-error">{lastNameErr}</div>}
              </div>
              {notFoundErr && <div className="field-error" style={{marginBottom:12,fontSize:13}}>{notFoundErr}</div>}
              <button className="btn btn-primary" onClick={handleStep1} disabled={!serverReady}>
                {serverReady ? 'Continue' : 'Warming up…'}
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                  <path d="M9 1l4 4m0 0l-4 4M13 5H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              {(allPartyMembers.length === 0 || allPartyMembers[0]?.id === currentGuest?.id) && (
                <button className="btn-back" onClick={() => setStep(1)}>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path d="M5 1L1 5m0 0l4 4M1 5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
              )}

              <div className="match-banner show">
                <span>Welcome, <span className="match-name">{currentGuest?.firstName} {currentGuest?.lastName}</span></span>
                {partyOthers.length > 0 && (
                  <div className="party-members-info">
                    You are part of a party with:{' '}
                    {partyOthers.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && ', '}
                        <strong>{m.firstName} {m.lastName}</strong>
                        {m.alreadyRsvped && <span style={{fontWeight: 400}}> (already responded)</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Will you be attending?</label>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="attending" value="yes"
                      checked={attending === 'yes'} onChange={() => setAttending('yes')} />
                    Yes, can't wait!
                  </label>
                  <label>
                    <input type="radio" name="attending" value="no"
                      checked={attending === 'no'} onChange={() => setAttending('no')} />
                    I can't make it
                  </label>
                </div>
                {attendingErr && <div className="field-error">{attendingErr}</div>}
              </div>

              <div className={`conditional-section ${attending === 'yes' ? 'visible' : ''}`}>
                <div className="section-divider"></div>
                <div className="form-group">
                  <label htmlFor="dietary">Dietary Restrictions or Allergies</label>
                  <input type="text" id="dietary" placeholder="e.g. vegetarian, gluten-free — or leave blank"
                    value={dietary} onChange={e => setDietary(e.target.value)} />
                </div>

                {currentGuest?.plusOne && (
                  <div className="conditional-section visible">
                    <div className="section-divider"></div>
                    <p className="section-label">Your Plus One</p>
                    <div className="form-group">
                      <label>Are you bringing a guest?</label>
                      <div className="radio-group">
                        <label>
                          <input type="radio" name="plusOne" value="yes"
                            checked={plusOne === 'yes'} onChange={() => setPlusOne('yes')} />
                          Yes, bringing a guest
                        </label>
                        <label>
                          <input type="radio" name="plusOne" value="no"
                            checked={plusOne === 'no'} onChange={() => setPlusOne('no')} />
                          No, just me
                        </label>
                      </div>
                    </div>
                    {plusOne === 'yes' && (
                      <div className="form-group">
                        <label htmlFor="plusOneName">Guest's Name</label>
                        <input type="text" id="plusOneName" placeholder="Full name of your plus one"
                          value={plusOneName} onChange={e => setPlusOneName(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}

                {currentGuest?.children && (
                  <div className="conditional-section visible">
                    <div className="section-divider"></div>
                    <p className="section-label">Little Ones</p>
                    <div className="form-group">
                      <label>Will you be bringing children?</label>
                      <div className="radio-group">
                        <label>
                          <input type="radio" name="children" value="yes"
                            checked={children === 'yes'} onChange={() => setChildren('yes')} />
                          Yes
                        </label>
                        <label>
                          <input type="radio" name="children" value="no"
                            checked={children === 'no'} onChange={() => setChildren('no')} />
                          No
                        </label>
                      </div>
                    </div>
                    {children === 'yes' && (
                      <div className="form-group">
                        <label htmlFor="childNames">Children's Names &amp; Ages</label>
                        <input type="text" id="childNames" placeholder="e.g. Emma (7), Jack (4)"
                          value={childNames} onChange={e => setChildNames(e.target.value)} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{marginTop: 28}}>
                {partyQueue.length > 0 && (attending === 'yes' || (allPartyMembers[0]?.id !== currentGuest?.id && !!attending)) && (
                  <button className="btn-next-party" onClick={handleNextPartyMember} disabled={submitting}>
                    {submitting ? 'Saving…' : `RSVP for ${partyQueue[0].firstName} ${partyQueue[0].lastName} →`}
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send RSVP'}
                </button>
              </div>
              {submitErr && <div className="field-error" style={{marginTop:10,textAlign:'center'}}>{submitErr}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const COLORS = ['#0588a5', '#ee3f3b', '#fbaf1b', '#ef813f'];
    const particles = [];

    // Bottom launch burst
    for (let i = 0; i < 130; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 16 + 8),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        wide: Math.random() * 7 + 4,
        tall: Math.random() * 4 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        alpha: 1,
        circle: Math.random() < 0.3,
      });
    }

    // H1 drizzle — originates near top of page, falls down
    for (let i = 0; i < 60; i++) {
      const x = canvas.width * 0.5 + (Math.random() - 0.5) * Math.min(canvas.width * 0.7, 420);
      particles.push({
        x,
        y: 60 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 2.5,
        vy: Math.random() * 1.5 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        wide: Math.random() * 5 + 3,
        tall: Math.random() * 3 + 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        alpha: 0,
        alphaIn: Math.random() * 0.03 + 0.01,
        circle: Math.random() < 0.3,
      });
    }

    const gravity = 0.32;
    const startTime = Date.now();
    let rafId;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = (Date.now() - startTime) / 1000;
      let alive = false;

      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (p.alphaIn && p.alpha < 1) p.alpha = Math.min(1, p.alpha + p.alphaIn);
        if (elapsed > 2.8) p.alpha -= 0.014;
        if (p.alpha <= 0) continue;
        alive = true;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.wide / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.wide / 2, -p.tall / 2, p.wide, p.tall);
        }
        ctx.restore();
      }

      if (alive && elapsed < 7) {
        rafId = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      canvas.remove();
    };
  }, []);

  return null;
}

function Header() {
  return (
    <header className="site-header">
      <span className="eyebrow">RSVP TO</span>
      <h1>Kioko's Graduation Party</h1>
      <div className="divider">
        <svg className="illustrated-marg" viewBox="0 0 44 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="currentColor" d="M 4,8 C 4,18 12,26 14,26 L 26,26 C 28,26 36,18 36,8 Z"/>
          <rect fill="currentColor" x="18" y="26" width="4" height="10" rx="1"/>
          <rect fill="currentColor" x="9" y="39" width="22" height="3" rx="1.5"/>
          <path fill="#4caf50" d="M 28,8 A 6,6 0 0,1 40,8 Z"/>
        </svg>
      </div>
      <p className="subtitle">june 6th, 2026</p>
    </header>
  );
}
