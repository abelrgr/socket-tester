import { IsObject, IsNotEmpty } from 'class-validator';

export class CreateShareDto {
  @IsObject()
  @IsNotEmpty()
  config!: Record<string, unknown>;
}
