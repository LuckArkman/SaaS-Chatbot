import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  HasMany,
  ForeignKey,
  BelongsTo // Adicionado para a relação com Company
} from "sequelize-typescript";
import Company from "./Company";
import FilesOptions from "./FilesOptions";
import Campaign from "./Campaign"; // Adicionada a importação de Campaign

@Table({
  tableName: "Files"
})
class Files extends Model<Files> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  // Adicionada a relação BelongsTo para Company
  @BelongsTo(() => Company)
  company: Company;

  @Column
  name: string;

  @Column
  message: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => FilesOptions)
  options: FilesOptions[];

  // Adicionada a relação inversa para Campaign
  @HasMany(() => Campaign)
  campaigns: Campaign[];
}

export default Files;