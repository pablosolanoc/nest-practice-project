import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productrepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      if (!createProductDto.slug) {
        createProductDto.slug = createProductDto.title
          .toLowerCase()
          .replaceAll(' ', '_')
          .replaceAll("'", '');
      } else {
        createProductDto.slug = createProductDto.slug
          .toLowerCase()
          .replaceAll(' ', '_')
          .replaceAll("'", '');
      }

      const product = this.productrepository.create({
        ...createProductDto,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });
      await this.productrepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productrepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    return products.map((product) => ({
      ...product,
      images: product.images.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let productToFind: Product;

    if (isUUID(term)) {
      productToFind = await this.productrepository.findOneBy({ id: term });
    } else {
      // productToFound = await this.productrepository.findOneBy({ slug: term });
      const queryBuilder = this.productrepository.createQueryBuilder('prod');
      productToFind = await queryBuilder
        .where(`UPPER(title) =:title or slug=:slug`, {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!productToFind) {
      throw new NotFoundException(`Product with term = ${term} not found`);
    }
    return {
      ...productToFind,
    };
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;

    let productToUpdate = await this.productrepository.preload({
      id: id,
      ...toUpdate,
    });

    if (!productToUpdate)
      throw new NotFoundException(`Product with id: ${id} not found`);

    //  Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, {
          product: {
            id,
          },
        });
        productToUpdate.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }

      await queryRunner.manager.save(productToUpdate);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      // await this.productrepository.save(productToUpdate);
      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBExceptions(error);
    }
    // this.productrepository.update(productToUpdate);

    return;
  }

  async remove(id: string) {
    const productFound = await this.productrepository.findOneBy({ id });
    if (productFound) {
      return this.productrepository.remove(productFound);
    }
    throw new NotFoundException(`Product with id = ${id} not found`);
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected errors, check server logs',
    );
  }

  async deleteAllProducts() {
    const query = this.productrepository.createQueryBuilder('product');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
