# Chatbot Modal

Estado actualizado del asistente contextual del dashboard.

## Estado real

El chatbot:

- **no** esta montado globalmente en el shell
- **solo** debe aparecer en pantallas que le pasen contexto explicito
- usa la ruta `POST /api/chat`
- requiere `GROQ_API_KEY`
- responde solo con el contexto visible que recibe

No debe documentarse como "listo para produccion" mientras no tenga rollout, observabilidad y politicas de acceso mas finas por pantalla.

## Superficie actual

- `src/components/dashboard/chatbot-modal.tsx`
- `src/app/api/chat/route.ts`

## Reglas operativas

- Si la pantalla no pasa `summary/context`, el modal no se renderiza.
- La API valida sesion y acceso antes de procesar la solicitud.
- La API devuelve errores en shape `{ message, error }`.
- Los errores al cliente deben ser genericos; no se exponen respuestas crudas del proveedor.

## Variables de entorno

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
```

## Modelo actual

- `openai/gpt-oss-120b`
- `temperature: 0.2`
- `max_tokens: 256`

## Riesgos pendientes

- rate limit en memoria
- ausencia de trazabilidad conversacional persistente
- politicas de habilitacion por pantalla todavia manuales
- sin rollout formal de produccion
