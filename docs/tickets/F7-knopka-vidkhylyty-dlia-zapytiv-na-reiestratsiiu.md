# F7 · Кнопка «Відхилити» для запитів на реєстрацію + DELETE-ендпоінт

| Пріоритет | Оцінка | Епік | Залежить від |
|---|---|---|---|
| **P2** | S (до пів дня) | Фронтенд і UX | — |

## Контекст

Єдина дія в адмін-менеджері запитів на реєстрацію — «Підтвердити»; на бекенді роутер має лише GET / і POST /:id/approve, ендпоінта відхилення не існує взагалі. Помилковий або сторонній запит висітиме вічно, тримаючи бейдж-лічильник на табі «Запити», і створює ризик, що адмін випадково підтвердить його, аби «прибрати» — а підтвердження створює повноцінний акаунт лікаря. Потрібні DELETE-ендпоінт на бекенді (за наявним шаблоном роутера, під requireRoles("admin")) і кнопка «Відхилити» з ConfirmModal у фронтенд-менеджері.

## Кроки реалізації

1. backend/src/services/registrationRequests.service.ts — додати наприкінці:
```ts
export const rejectRegistration = async (requestId: string) => {
  const request = await RegistrationRequest.findByIdAndDelete(requestId);
  if (!request) {
    throw new Error("Запит не знайдено");
  }
  await ActivityLog.create({
    action: "rejected-registration",
    meta: { email: request.email },
  });
  return request;
};
```
2. backend/src/controllers/registrationRequests.controller.ts — додати rejectRegistrationRequest за шаблоном approveRegistrationRequest (рядки 20–34 цього ж файлу, він використовує try/catch → res.status(400).json({ message })):
```ts
export const rejectRegistrationRequest = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    await RegistrationRequestsService.rejectRegistration(id);
    res.json({ message: "Запит відхилено" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};
```
3. backend/src/routes/registrationRequests.routes.ts — після POST /:id/approve (рядки 10–14) додати:
```ts
router.delete(
  "/:id",
  validateObjectIdParams("id"),
  RegistrationRequestsController.rejectRegistrationRequest,
);
```
(router.use(authMiddleware, requireRoles("admin")) на рядку 8 уже покриває цей маршрут).
4. frontend/src/api/referenceApi.ts — після approveRegistration (рядки 58–65) додати:
```ts
export const rejectRegistration = async (id: string): Promise<void> => {
  await axios.delete(`${BASE_URL}/registration-requests/${id}`);
};
```
5. frontend/src/components/Admin/RegistrationRequestsManager.tsx: імпортувати rejectRegistration і ConfirmModal; додати стани `rejectingRequest: IRegistrationRequest | null` та `isRejecting: boolean`; у list-row-actions (рядки 95–110) поруч із «Підтвердити» додати кнопку `<button onClick={() => setRejectingRequest(r)} className="btn btn-sm btn-danger-soft">Відхилити</button>`; наприкінці компонента — ConfirmModal: title="Відхилити запит", message=`Відхилити запит на реєстрацію від ${rejectingRequest?.name?.trim() || rejectingRequest?.email}? Запит буде видалено, акаунт не буде створено.`, isDanger, isLoading={isRejecting}, loadingLabel="Відхиляємо…"; onConfirm → rejectRegistration(rejectingRequest._id) → toast.success("Запит відхилено.") → setRejectingRequest(null) → await load() (load уже оновлює бейдж через подію registrationRequestsUpdated); у catch — toast.error("Не вдалося відхилити запит. Спробуйте ще раз.").

## Критерії приймання

- [ ] DELETE /registration-requests/:id вимагає роль admin (для неавторизованих/не-адмінів — 401/403), при невалідному ObjectId — помилка валідації, при неіснуючому id — 400 з «Запит не знайдено».
- [ ] Відхилення видаляє документ RegistrationRequest і НЕ створює запис у User; в ActivityLog зʼявляється дія rejected-registration.
- [ ] У кожному рядку запиту в UI є «Відхилити» (btn-danger-soft) з ConfirmModal і станом «Відхиляємо…»; після відхилення запит зникає зі списку, бейдж на табі «Запити» зменшується.
- [ ] Логін даними відхиленого запиту неможливий.
- [ ] `npm run build` у backend/ і frontend/ проходить.

## Ручна перевірка

> У проєкті немає тест-сьюти — перевірка виконується вручну на локальному дев-середовищі. Жодних дій проти продакшн-БД.

1. Локально зареєструвати ТЕСТОВОГО лікаря через сторінку реєстрації (роль doctor) — у Довідники → Запити зʼявляється запит, бейдж = 1.
2. Натиснути «Відхилити», підтвердити в модалці — запит зник, бейдж оновився, тост показано.
3. Спробувати залогінитися email/паролем відхиленого запиту — відмова.
4. curl-ом без токена: `curl -X DELETE http://localhost:PORT/registration-requests/<id>` — 401.
5. Це тестові дані — реальні запити на реєстрацію в dev-БД не чіпати.

## Файли

- `backend/src/services/registrationRequests.service.ts`
- `backend/src/controllers/registrationRequests.controller.ts`
- `backend/src/routes/registrationRequests.routes.ts`
- `frontend/src/api/referenceApi.ts`
- `frontend/src/components/Admin/RegistrationRequestsManager.tsx`

---
*Закриває висновки аудиту (див. `docs/audit-2026-08.html`):*
- «Запит на реєстрацію можна лише підтвердити — «Відхилити» немає»
