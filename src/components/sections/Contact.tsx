import { ArrowDownRight, ArrowRight, CircleAlert, Mail } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eyebrow } from './Story'

const labels = {
  name: 'Full Name',
  organisation: 'Organisation',
  email: 'Email Address',
  type: 'Enquiry Type',
  message: 'Message',
}

const fields = Object.keys(labels) as (keyof typeof labels)[]
type Errors = Partial<Record<keyof typeof labels, string>>

export function Contact() {
  const [type, setType] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [validated, setValidated] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const issues: Errors = {}
    for (const field of fields) {
      const control = form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (!control.value.trim()) issues[field] = `Enter or select ${labels[field].toLowerCase()}.`
      else if (control.validity.typeMismatch) issues[field] = 'Enter a valid email address.'
    }
    setErrors(issues)
    const firstInvalid = fields.find(field => issues[field])
    setValidated(!firstInvalid)
    if (firstInvalid) (form.elements.namedItem(firstInvalid) as HTMLElement).focus()
  }

  return (
    <section id="contact" className="contact section" aria-labelledby="contact-title">
      <div className="contact-art" aria-hidden="true" />
      <div className="shell contact-grid">
        <div className="section-copy">
          <Eyebrow index="05">Contact Lebati</Eyebrow>
          <h2 id="contact-title">Work With <em>Lebati.</em></h2>
          <p>Enquiries from regulators, authorised operators and strategic partners are welcome.</p>
          <div className="actions">
            <a className="button primary" href="#enquiry-form" onClick={() => setType('General enquiry')}>Contact Us <ArrowDownRight size={17} /></a>
            <a className="button secondary" href="#enquiry-form" onClick={() => setType('Operator enquiry')}>Operator Enquiry <ArrowRight size={17} /></a>
          </div>
        </div>
        <form id="enquiry-form" className="glass enquiry-form" noValidate onSubmit={submit} onChange={() => { if (validated) setValidated(false) }}>
          <div className="form-title"><Mail size={20} /><h3>Enquiry form</h3><span>DEMO</span></div>
          <p className="form-note" id="form-note"><CircleAlert size={15} /> This preview checks your entries locally. Enquiry delivery is pending integration.</p>
          <div className="form-fields">
            {fields.map(field => {
              const props = { id: `enquiry-${field}`, name: field, required: true, 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `error-${field}` : undefined }
              return (
                <div key={field} className={field === 'message' ? 'form-field full-field' : 'form-field'}>
                  <label htmlFor={props.id}>{labels[field]}</label>
                  {field === 'message' ? <textarea {...props} rows={3} maxLength={3000} placeholder="Tell us about your enquiry" /> : field === 'type' ? (
                    <select {...props} value={type} onChange={event => setType(event.target.value)}>
                      <option value="" disabled>Select a type</option>
                      {['General enquiry', 'Operator enquiry', 'Regulatory enquiry', 'Strategic partnership'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  ) : <input {...props} type={field === 'email' ? 'email' : 'text'} autoComplete={field === 'organisation' ? 'organization' : field} maxLength={254} placeholder={field === 'email' ? 'you@organisation.co.za' : field === 'name' ? 'Your name' : 'Organisation name'} />}
                  {errors[field] && <span className="field-error" id={`error-${field}`}>{errors[field]}</span>}
                </div>
              )
            })}
          </div>
          <button className="button primary" type="submit" aria-describedby="form-note">Validate Enquiry <ArrowRight size={17} /></button>
          <div className="form-status" role="status">{validated && 'All fields passed validation. This preview has no enquiry delivery service.'}</div>
        </form>
      </div>
    </section>
  )
}
