globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, c as Fragment, h as maybeRenderHead, i as spreadAttributes, m as renderTemplate, s as renderComponent } from "./console_DJjdPkxA.mjs";
import { t as createComponent } from "./compiler_Dj7ZnC2x.mjs";
import { a as inquiryLink, h as t, i as inquiryChannel } from "./view_C4InCl6p.mjs";
//#region src/components/WhatsAppContact.astro
createAstro("https://astro.build");
var $$WhatsAppContact = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$WhatsAppContact;
	const { locale, variant = "button", class: extraClass = "", message } = Astro.props;
	const s = t(locale);
	const live = inquiryChannel().live;
	const link = live ? inquiryLink(locale, message ?? s.dialog.general, "/") : void 0;
	const classes = `whatsapp-contact ${variant === "icon" ? "icon-btn" : variant === "menu" ? "" : variant === "light" ? "btn btn--light" : "btn btn--solid"} ${extraClass}`;
	const label = live ? s.whatsapp.contact : `${s.whatsapp.contact} — ${s.whatsapp.pending}`;
	return renderTemplate`${link ? renderTemplate`${maybeRenderHead($$result)}<a${addAttribute(classes, "class")}${addAttribute(link.href, "href")}${spreadAttributes(link.attrs)}${addAttribute(variant === "icon" ? label : void 0, "aria-label")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 20 1.2-4A8.5 8.5 0 1 1 9 19.4Z"></path><path d="m9 7-1 1.5c.7 2.4 3 4.7 5.4 5.4L15 13l-2-1.3-.8.8a7 7 0 0 1-2.6-2.6l.8-.8Z"></path></svg>${variant !== "icon" && renderTemplate`<span>${s.whatsapp.contact}</span>`}</a>` : renderTemplate`<button${addAttribute(`${classes} whatsapp-contact--pending`, "class")} type="button" disabled${addAttribute(label, "aria-label")}${addAttribute(s.whatsapp.pendingDescription, "title")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 20 1.2-4A8.5 8.5 0 1 1 9 19.4Z"></path><path d="m9 7-1 1.5c.7 2.4 3 4.7 5.4 5.4L15 13l-2-1.3-.8.8a7 7 0 0 1-2.6-2.6l.8-.8Z"></path></svg>${variant !== "icon" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span>${s.whatsapp.contact}</span><span class="whatsapp-contact__status">${s.whatsapp.pending}</span>` })}`}</button>`}`;
}, "/home/user/jwleria/apps/storefront/src/components/WhatsAppContact.astro", void 0);
//#endregion
export { $$WhatsAppContact as t };
