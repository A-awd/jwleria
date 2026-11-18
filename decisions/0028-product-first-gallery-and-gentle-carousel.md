# 0028 — Product photograph first; a gentle, swipeable gallery

Status: accepted (owner, 2026-11-18, Asia/Riyadh). It refines decision 0027's gallery; everything else in 0027 stands.

## Owner direction

**Order**
- A product page's first photograph is the standalone product on the agreed light background:
  - the accepted #f0f0f0 flat tile; or
  - under the 0027 fallback, an isolated official packshot on its own plain background.
- In-use photographs follow it, never first.
- The first image is never a placeholder.
- The primary and the approved order are never changed.

**Navigation:** other photographs are discoverable by automatic navigation and by swiping left or right, inside the existing storefront, with no gallery library and no redesign.

## Behaviour

**The gallery**
- Each selected variant's own photographs sit in a native horizontal scroll-snap row.
- Vertical page scrolling and pinch zoom stay native; no scroll or touch event is prevented.
- With two or more photographs, the row has numbered dots and a count, previous and next controls (mirrored for right-to-left) and a labelled pause/play control.
- One photograph shows as before, with no controls and no automatic advance.

**Automatic advance (every 5 s)** runs only when all of these hold:
- there are at least two photographs;
- the gallery is at least half on screen;
- the page is visible;
- the visitor does not prefer reduced motion.

It stops for good on the visitor's own touch, drag, wheel, key press, focus or navigation. The pause/play control can stop it, or start it again, including under reduced motion.

**Stability and order**
- Each slide keeps its frame, contains the whole image (no crop or stretch) and never changes the page's height.
- Each newly selected variant starts at its primary.
- The in-place variant swap tears down the previous gallery's timer, observers and listeners before setting up the new one, so nothing runs twice.

**Release:** the change ships as a new immutable Worker package version; earlier packages are kept. It deploys when an authenticated Wrangler session is available, and data publication does not wait for it.
