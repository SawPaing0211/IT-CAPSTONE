// One shared way for every role's account menu to open the change-password dialog,
// which is mounted once in App.jsx.
export const CHANGE_PASSWORD_EVENT = 'forge:change-password'
export const openChangePassword = () => window.dispatchEvent(new Event(CHANGE_PASSWORD_EVENT))
