import HomeCare from "../models/HomeCareSchema";

const ensureHomeCareOrder = async () => {
  const homeCares = await HomeCare.find().sort({ order: 1, _id: 1 });
  const needsUpdate = homeCares.some((item, index) => item.order !== index);

  if (!needsUpdate) {
    return;
  }

  await HomeCare.bulkWrite(
    homeCares.map((item, index) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { order: index } },
      },
    })),
  );
};

export const getAllHomeCaresService = async (search?: string) => {
  await ensureHomeCareOrder();
  const query: any = {};
  if (search) query.name = { $regex: search, $options: "i" };
  return await HomeCare.find(query).sort({ order: 1, _id: 1 });
};

export const createHomeCareService = async (data: {
  name: string;
  morning?: boolean;
  evening?: boolean;
}) => {
  const lastItem = await HomeCare.findOne().sort({ order: -1 });
  const nextOrder = typeof lastItem?.order === "number" ? lastItem.order + 1 : 0;

  return await HomeCare.create({
    ...data,
    order: nextOrder,
  });
};
export const updateHomeCareService = async (
  id: string,
  data: { name: string; morning?: boolean; evening?: boolean }
) => {
  return await HomeCare.findByIdAndUpdate(id, { $set: data }, { new: true });
};
export const deleteHomeCareService = async (id: string) => {
  const deleted = await HomeCare.findByIdAndDelete(id);
  await ensureHomeCareOrder();
  return deleted;
};

export const reorderHomeCaresService = async (ids: string[]) => {
  await HomeCare.bulkWrite(
    ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    })),
  );

  return await HomeCare.find().sort({ order: 1, _id: 1 });
};
