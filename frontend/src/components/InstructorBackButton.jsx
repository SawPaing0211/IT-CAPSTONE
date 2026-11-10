export default function InstructorBackButton({ onClick, children = 'Back' }) {
  return <button type="button" className="ir-secondary ir-back-button" onClick={onClick}>
    <span aria-hidden="true">←</span><span>{children}</span>
  </button>
}
