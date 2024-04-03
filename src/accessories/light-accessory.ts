import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, HAPStatus } from 'homebridge';
import { HubspacePlatform } from '../platform';
import { HubspaceAccessory } from './hubspace-accessory';
import { isNullOrUndefined } from '../utils';
import { FunctionCharacteristic } from '../models/function-characteristic';
import convert from 'color-convert';

/**
 * Light accessory for Hubspace platform
 */
export class LightAccessory extends HubspaceAccessory {
    /**
     * Color information for lights that support RGB
     */
    private readonly _lightColor: {
        hue?: number;
        saturation?: number;
    } = {};

    /**
     * Creates a new instance of the accessory
     * @param platform Hubspace platform
     * @param accessory Platform accessory
     */
    constructor(platform: HubspacePlatform, accessory: PlatformAccessory) {
        super(platform, accessory, platform.Service.Lightbulb);

        this.configurePower();
        this.configureBrightness();
        this.configureColorRgb();
    }

    private configurePower(): void {
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this))
            .onSet(this.setOn.bind(this));
    }

    private configureBrightness(): void {
        if (!this.supportsCharacteristic(FunctionCharacteristic.Brightness)) return;

        this.service.getCharacteristic(this.platform.Characteristic.Brightness)
            .onGet(this.getBrightness.bind(this))
            .onSet(this.setBrightness.bind(this));
    }

    private configureColorRgb(): void {
        if (!this.supportsCharacteristic(FunctionCharacteristic.ColorRgb)) return;

        this.service.getCharacteristic(this.platform.Characteristic.Hue)
            .onGet(this.getHue.bind(this))
            .onSet(this.setHue.bind(this));

        this.service.getCharacteristic(this.platform.Characteristic.Saturation)
            .onGet(this.getSaturation.bind(this))
            .onSet(this.setSaturation.bind(this));
    }

    private async getHue(callback: CharacteristicGetCallback): Promise<CharacteristicValue> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.ColorRgb);
            const value = await this.deviceService.getValueAsString(this.device.deviceId, deviceFc);

            if (!value) {
                this.setNotResponding();
                throw new Error('Value not available');
            }

            const color = convert.hex.hsl(value);
            return color[0];
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }

    private async getSaturation(callback: CharacteristicGetCallback): Promise<CharacteristicValue> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.ColorRgb);
            const value = await this.deviceService.getValueAsString(this.device.deviceId, deviceFc);

            if (!value) {
                this.setNotResponding();
                throw new Error('Value not available');
            }

            const color = convert.hex.hsl(value);
            return color[1];
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }

    private async getOn(callback: CharacteristicGetCallback): Promise<CharacteristicValue> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.Power);
            const value = await this.deviceService.getValueAsBoolean(this.device.deviceId, deviceFc);

            if (isNullOrUndefined(value)) {
                throw new Error('Value not available');
            }

            return value!;
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }

    private async getBrightness(callback: CharacteristicGetCallback): Promise<CharacteristicValue> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.Brightness);
            const value = await this.deviceService.getValueAsInteger(this.device.deviceId, deviceFc);

            if (isNullOrUndefined(value) || value === -1) {
                throw new Error('Value not available');
            }

            return value!;
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }

    private async setHue(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        try {
            this._lightColor.hue = value as number;

            if (this.isColorDefined()) {
                await this.setRgbColor(this._lightColor.hue!, this._lightColor.saturation!, callback);
                this.resetColor();
            }

            callback(null);
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    private async setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        try {
            this._lightColor.saturation = value as number;

            if (this.isColorDefined()) {
                await this.setRgbColor(this._lightColor.hue!, this._lightColor.saturation!, callback);
                this.resetColor();
            }

            callback(null);
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    private async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.Power);
            await this.deviceService.setValue(this.device.deviceId, deviceFc, value);

            callback(null);
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    private async setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.Brightness);
            await this.deviceService.setValue(this.device.deviceId, deviceFc, value);

            callback(null);
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    private async setRgbColor(hue: number, saturation: number, callback: CharacteristicSetCallback): Promise<void> {
        try {
            const deviceFc = this.getFunctionForCharacteristics(FunctionCharacteristic.ColorRgb);
            const hexValue = convert.hsv.hex([hue, saturation, 100]) as string;

            await this.deviceService.setValue(this.device.deviceId, deviceFc, hexValue);

            callback(null);
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Unknown error'));
        }
    }

    private resetColor(): void {
        this._lightColor.hue = undefined;
        this._lightColor.saturation = undefined;
    }

    private isColorDefined(): boolean {
        return !isNullOrUndefined(this._lightColor.hue) && !isNullOrUndefined(this._lightColor.saturation);
    }
}
