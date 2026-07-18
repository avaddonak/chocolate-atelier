# Подключение Supabase

1. Создайте проект на https://supabase.com.
2. Откройте SQL Editor и выполните `supabase/schema.sql`.
3. В Authentication → Users создайте пользователя администратора.
4. В SQL Editor назначьте ему роль, заменив email:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

5. В Project Settings → API скопируйте Project URL и public anon key.
6. В GitHub: Settings → Secrets and variables → Actions → Variables добавьте:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. После добавления переменных перезапустите workflow GitHub Pages.

Админ-панель:

`https://avaddonak.github.io/chocolate-atelier/#/admin`

Публичный anon key безопасно использовать в браузере: доступ ограничивается политиками RLS из `schema.sql`. Service role key на сайт добавлять нельзя.
