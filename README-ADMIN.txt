PORTFOLIO ADMIN ACCESS
======================

Admin URL:
  /admin

Local:
  http://localhost:3000/admin

Username:
  admin

Password:
  IsmaelPortfolio@2026!

What was fixed:
- Skill category SVG icons are now compact and do not change the existing font size.
- Profile photo frame uses the same cream/panel visual language as the portfolio.
- Direct /admin URL opens the admin login automatically.
- Admin password was updated and the original demo password is migrated once if it is still in the database.
- After login, the existing Edit/Add controls remain available directly from the page.

Run:
  npm install
  npm start

Important:
- If you deploy online, set ADMIN_PASSWORD and JWT_SECRET environment variables.
- The password above is a starter password; change it from the admin panel after first login.
