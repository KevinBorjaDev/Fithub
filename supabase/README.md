# Backend (Supabase)

El backend de FitHub **es** Supabase: Postgres + PostgREST + Storage + Auth.
No hay servidor propio ni API intermedia. La app web y (a futuro) la móvil
hablan directo contra Supabase, y toda la autorización vive en las policies
de RLS que están en `migrations/`.

## Recrear el proyecto desde cero

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Eso aplica todas las migraciones: tablas, enums, funciones, las policies de
RLS y los buckets de Storage.

## Lo que NO está en las migraciones

Estos pasos son manuales, en el dashboard de Supabase. Sin ellos el esquema
está completo pero la app no funciona.

### 1. Autenticación

En *Authentication → Providers*:

- **Email**: habilitado. Definir si se exige confirmación de correo.
- **Google** y **Apple**: habilitar y cargar client ID y secret de cada uno.
  Hay que crear las credenciales en Google Cloud Console y en Apple Developer,
  registrando como callback la URL que muestra Supabase
  (`https://<PROJECT_REF>.supabase.co/auth/v1/callback`).

La pantalla de acceso consulta `/auth/v1/settings` al cargar y **habilita los
botones de Google y Apple solo si el proveedor está activo** en este dashboard.
Mientras no lo estén, los botones aparecen deshabilitados con un aviso, en vez
de fallar al pulsarlos. No hay que tocar código al activarlos.

En *Authentication → URL Configuration*:

- **Site URL**: la URL de producción.
- **Redirect URLs**: agregar la de producción, `http://localhost:3000` para
  desarrollo y, cuando exista la app móvil, su deep link.

En *Authentication → Email Templates*: revisar los correos de confirmación y
de recuperación de contraseña (la app tiene una ruta `/reset-password`).

### 2. Primer usuario administrador

Los roles viven en `public.user_roles` con el enum `app_role` (`admin` /
`patient`). El primer admin se crea a mano: registrar el usuario desde la app
y luego insertar su fila.

```sql
insert into public.user_roles (user_id, role)
values ('<UUID del usuario>', 'admin');
```

### 3. Variables de entorno

Copiar `.env.example` a `.env` y completar con los valores de
*Settings → API*. El `.env` está en `.gitignore` y no debe subirse.

## Storage

Ocho buckets, todos **privados**. El acceso se resuelve con signed URLs
(`createSignedUrl`) más las policies sobre `storage.objects`.

| Bucket | Contenido | Límite |
|---|---|---|
| `patient-photos` | Fotos de progreso (4 ángulos por sesión) | 10 MB |
| `photo-reference` | Imágenes de referencia de poses | 10 MB |
| `measurement-references` | Referencias de medición | 10 MB |
| `nutri-profile` | Fotos del perfil del nutricionista | 10 MB |
| `avatars` | Avatares de usuario | 5 MB |
| `patient-documents` | Exámenes de laboratorio, fichas | 25 MB |
| `nutrition-plans` | Planes nutricionales | 25 MB |
| `program-resources` | Material del programa | 50 MB |

No pasarlos a públicos: contienen fotos de pacientes y estudios médicos.

## Notas de operación

- **Free tier**: los proyectos se pausan tras ~7 días de inactividad y hay que
  reactivarlos a mano desde el dashboard. No incluye backups automáticos.
  El límite de 1 GB de Storage es el que esta app va a tocar primero.
- **Transferencia de propiedad**: se hace de organización a organización desde
  *Settings → General → Transfer project*. Conviene que el proyecto viva en una
  organización dedicada a FitHub para que el traspaso sea limpio.
- **Backup completo**: `pg_dump` sobre la cadena de conexión de
  *Settings → Database*. Los archivos de Storage se respaldan aparte: un dump
  de Postgres no incluye binarios.
