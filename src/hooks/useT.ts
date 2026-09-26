import { STRINGS, type Strings } from '@libs/i18n'
import { useSettings } from '@services/settingAPI'

export const useT = (): Strings => STRINGS[useSettings().lang]
