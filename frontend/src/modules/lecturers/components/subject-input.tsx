import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { normalizeSubjects, tidySubject } from '@shigjetademy/shared/lecturers'
import { FieldError } from '#/modules/auth/components/auth-field'

/** Suggestions shown at once, so the list stays short */
const SUGGESTIONS_MAX = 6

const NO_ACTIVE_OPTION = -1

type GetSuggestionsParams = {
  known: string[]
  chosen: string[]
  text: string
}

/** Known subjects containing the typed text that aren't chosen yet, in any case */
const getSuggestions = ({ known, chosen, text }: GetSuggestionsParams) => {
  const typed = tidySubject(text).toLowerCase()
  if (!typed) return []
  const taken = new Set(chosen.map((subject) => subject.toLowerCase()))
  return known.filter((subject) => subject.toLowerCase().includes(typed) && !taken.has(subject.toLowerCase())).slice(0, SUGGESTIONS_MAX)
}

interface SubjectInputProps {
  id: string
  value: string[]
  /** Subjects already used in the organization */
  suggestions: string[]
  isDisabled: boolean
  error?: string
  onChange: (subjects: string[]) => void
}

/** A text input that turns what is typed into subject tags: Enter or a comma adds one, Backspace on an empty input removes the last, and known subjects are suggested */
export function SubjectInput({ id, value, suggestions, isDisabled, error, onChange }: SubjectInputProps) {
  const [text, setText] = useState('')
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION)
  const listboxId = useId()
  const hintId = useId()
  const errorId = `${id}-error`
  const options = getSuggestions({ known: suggestions, chosen: value, text })
  const isExpanded = options.length > 0
  const activeOption = options[activeIndex]

  const add = (subject: string) => {
    onChange(normalizeSubjects([...value, subject]))
    setText('')
    setActiveIndex(NO_ACTIVE_OPTION)
  }

  const remove = (subject: string) => onChange(value.filter((item) => item !== subject))

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
      case ',':
        // Enter would submit the form; a comma would be typed into the subject
        event.preventDefault()
        if (activeOption) add(activeOption)
        else if (tidySubject(text)) add(text)
        return
      case 'Backspace': {
        const last = value.at(-1)
        if (!text && last) remove(last)
        return
      }
      case 'ArrowDown':
        if (!isExpanded) return
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % options.length)
        return
      case 'ArrowUp':
        if (!isExpanded) return
        event.preventDefault()
        setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1))
        return
      case 'Escape':
        if (!text) return
        // Keeps a dialog around it open
        event.preventDefault()
        setText('')
        setActiveIndex(NO_ACTIVE_OPTION)
        return
      default:
        return
    }
  }

  const handleTextChange = (next: string) => {
    setText(next)
    setActiveIndex(NO_ACTIVE_OPTION)
  }

  // A subject typed but not added yet still counts when the field is left
  const handleBlur = () => {
    if (tidySubject(text)) add(text)
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={id}>
        Subjects
      </label>
      <div className="relative">
        <div className="flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-xl border border-rule-strong bg-white px-2.5 py-2 transition-[border-color,box-shadow] duration-150 focus-within:border-green-deep focus-within:shadow-[0_0_0_3px_var(--green-wash)] hover:border-ink-3">
          {value.length > 0 ? (
            <ul className="contents" aria-label="Chosen subjects">
              {value.map((subject) => (
                <li key={subject} className="inline-flex items-center gap-1 rounded-full bg-green-wash py-0.5 pr-1 pl-2.5 text-[0.93rem] font-semibold text-green-deep">
                  {subject}
                  <button
                    type="button"
                    className="grid size-6 place-items-center rounded-full hover:bg-white"
                    aria-label={`Remove ${subject}`}
                    disabled={isDisabled}
                    onClick={() => remove(subject)}
                  >
                    <X size={13} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            className="min-h-8 min-w-[10ch] flex-1 bg-transparent px-1 text-base placeholder:text-ink-3 focus:outline-none"
            placeholder={value.length > 0 ? 'Add another' : 'Like Mathematics or English'}
            aria-autocomplete="list"
            aria-expanded={isExpanded}
            aria-controls={listboxId}
            aria-activedescendant={activeOption ? `${listboxId}-${activeIndex}` : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            disabled={isDisabled}
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </div>
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Subject suggestions"
          className="absolute inset-x-0 top-full z-10 mt-1 grid gap-0.5 rounded-xl border border-rule bg-white p-1 shadow-card empty:hidden"
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className="cursor-pointer rounded-lg px-3 py-2 aria-selected:bg-mist hover:bg-mist"
              // Chosen on mouse down, before the input's blur adds the half-typed text instead
              onMouseDown={(event) => {
                event.preventDefault()
                add(option)
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      </div>
      <p id={hintId} className="text-[0.93rem] text-ink-3">
        Press Enter or a comma to add a subject.
      </p>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
