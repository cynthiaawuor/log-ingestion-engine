import { validate } from "class-validator";

export default async function (obj: any) {
  const validationErrors = await validate(obj, { forbidUnknownValues: false });

  return validationErrors.map((error) => ({
    field: error.property,
    reason: Object.values(error.constraints ?? {}),
  }));
}
