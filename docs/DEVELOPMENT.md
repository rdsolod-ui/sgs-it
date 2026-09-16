# Разработка через GitHub

Канонический репозиторий: `rdsolod-ui/sgs-it`. Основная ветка: `main`. Для изменений используйте `codex/<задача>`.

1. Получить актуальный `main`, внести ограниченное изменение.
2. Запустить тесты и сборки. Не добавлять реальные контакты в тестовые данные.
3. Запушить исходники, дождаться успешного CI для нужного commit SHA.
4. Собрать релиз из этого коммита. Проверить отсутствие незакоммиченных исходников.
5. Развернуть на VPS с manifest, резервной копией и проверкой health/браузера. Записать SHA релиза и путь возврата.

CI проверяет unit-тесты, PostgreSQL-интеграцию, сборку рабочего приложения и отдельную публичную демонстрацию. Артефакты не содержат `.env` и пользовательскую БД.

Секреты SSH/OpenAI не нужны для CI и не передаются pull request из внешних репозиториев. Публикация и обновление VPS выполняются с рабочей машины, имеющей авторизованный SSH-доступ.

В публичном preview отключены заявки и сетевые AI-запросы. Пользовательский чат остаётся только в памяти вкладки. Рабочий режим не должен использовать `DEPLOYMENT_ENV=staging` на открытом домене с реальными данными.

## Brand and social metadata

The flat mark is `src/components/BrandMark.tsx`; downloadable SVG and browser/PWA variants are in `public/`. The generated social card is `public/og/parkops-business-v1.jpg` (1200×630 JPEG). It was created with the built-in image generator and exported for the web; it is an illustration, not a screenshot of business data.

The creative direction: four pale ceramic business modules with one blue circular core, ivory background, strong Russian headline “Где ваш бизнес теряет деньги?”, brand SGS IT and supporting line about sales, CRM and operations in parkops.

Metadata follows [Open Graph](https://ogp.me/) and [Google supported tags](https://developers.google.com/search/docs/crawling-indexing/special-tags). Organization details follow [Google Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization). Root metadata is in the initial HTML, independent of JavaScript. `noindex` headers cover private API/admin/legal routes in the production Nginx config; the catalog preview stays noindex.

`npm run test:intro` exercises the real-time story against the preview server; set `INTRO_URL` for another test deployment. The test never submits customer contacts. For production source crawling use HTTP clients with Telegram/WhatsApp user-agent strings; actual app previews still depend on each messenger’s cache and client settings.
