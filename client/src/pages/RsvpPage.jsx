import { useState, useEffect } from 'react';
import { lookupGuest, submitRsvp, getSettings } from '../api';

export default function RsvpPage() {
  const [view, setView] = useState('form'); // 'form' | 'success'
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState({ title: 'Kioko', subtitle: 'Juris Doctor · Class of 2026' });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameErr, setFirstNameErr] = useState('');
  const [lastNameErr, setLastNameErr] = useState('');
  const [notFoundErr, setNotFoundErr] = useState('');

  const [currentGuest, setCurrentGuest] = useState(null);
  const [attending, setAttending] = useState('');
  const [dietary, setDietary] = useState('');
  const [plusOne, setPlusOne] = useState('');
  const [plusOneName, setPlusOneName] = useState('');
  const [children, setChildren] = useState('');
  const [childNames, setChildNames] = useState('');
  const [attendingErr, setAttendingErr] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successTitle, setSuccessTitle] = useState("We'll see you there!");
  const [successMsg, setSuccessMsg] = useState("Thank you for your RSVP. We can't wait to celebrate with you.");

  useEffect(() => {
    getSettings().then(s => {
      if (s.title) {
        setSettings(s);
        document.title = `RSVP — Celebrating ${s.title}`;
      }
    }).catch(() => {});
  }, []);

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
      setSuccessTitle("You're already on the list!");
      setSuccessMsg("We already received your RSVP — we've got you covered. See you there!");
      setView('success');
      return;
    }
    setCurrentGuest(res.guest);
    setStep(2);
  }

  async function handleSubmit() {
    setAttendingErr(''); setSubmitErr('');
    if (!attending) { setAttendingErr('Please select an option.'); return; }

    setSubmitting(true);
    try {
      await submitRsvp({
        name: currentGuest.firstName + ' ' + currentGuest.lastName,
        attending,
        dietary,
        plusOne,
        plusOneName: plusOne === 'yes' ? plusOneName : '',
        children,
        childNames: children === 'yes' ? childNames : '',
      });
      if (attending === 'no') {
        setSuccessTitle("We'll miss you!");
        setSuccessMsg('Thank you for letting us know. We hope to see you another time.');
      }
      setView('success');
    } catch {
      setSubmitErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'success') {
    return (
      <div className="page">
        <Header settings={settings} />
        <div className="view active">
          <div className="card">
            <div className="success-screen">
              <div className="success-icon">🥂</div>
              <h2>{successTitle}</h2>
              <p>{successMsg}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header settings={settings} />
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
              <button className="btn btn-primary" onClick={handleStep1}>Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button className="btn-back" onClick={() => setStep(1)}>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                  <path d="M5 1L1 5m0 0l4 4M1 5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>

              <div className="match-banner show">
                <span>👋</span>
                <span>Welcome, <span className="match-name">{currentGuest?.firstName} {currentGuest?.lastName}</span>!</span>
              </div>

              <div className="form-group">
                <label>Will you be attending?</label>
                <div className="radio-group">
                  <label><input type="radio" name="attending" value="yes" onChange={() => setAttending('yes')} /> ✓ &nbsp;Joyfully accepts</label>
                  <label><input type="radio" name="attending" value="no"  onChange={() => setAttending('no')}  /> ✗ &nbsp;Regretfully declines</label>
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
                        <label><input type="radio" name="plusOne" value="yes" onChange={() => setPlusOne('yes')} /> Yes, bringing a guest</label>
                        <label><input type="radio" name="plusOne" value="no"  onChange={() => setPlusOne('no')}  /> No, just me</label>
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
                        <label><input type="radio" name="children" value="yes" onChange={() => setChildren('yes')} /> Yes</label>
                        <label><input type="radio" name="children" value="no"  onChange={() => setChildren('no')}  /> No</label>
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

function Header({ settings }) {
  return (
    <header className="site-header">
      <span className="eyebrow">You're Invited</span>
      <h1>Celebrating<br /><em>{settings.title}</em></h1>
      <div className="divider"><div className="divider-diamond"></div></div>
      <p className="subtitle">{settings.subtitle}</p>
    </header>
  );
}
