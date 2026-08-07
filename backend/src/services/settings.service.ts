import Settings, { ISettings } from "../models/SettingsSchema";

export const getSettings = async (): Promise<ISettings> => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

export const updateSettings = async (
  data: Partial<ISettings>,
): Promise<ISettings> => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create(data);
  } else {
    Object.assign(settings, data);
    await settings.save();
  }
  return settings;
};
