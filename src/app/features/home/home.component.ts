import { Component } from '@angular/core';
import { HomeApiService } from './service/home-api.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { DetailData } from './models/detail-data';
import { TableColum } from './models/table-colum';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  // 使用者位置
  userPosition: number[] = [];
  // 判斷地圖是否已完成載入
  mapInitialized: boolean = false;
  // 地圖實例
  map!: L.Map;
  // 原始資料
  originalDetailData: DetailData[] = [];
  // Table資料
  detailData: DetailData[] = [];
  // Table header
  tableColumns: TableColum[] = [
    {
      header: '站名',
      field: 'sna',
    },
    {
      header: '地址',
      field: 'ar',
    },
    {
      header: '可租借車輛數',
      field: 'available_rent_bikes',
    },
    {
      header: '可租還車位數',
      field: 'available_return_bikes',
    },
    {
      header: '導航',
      field: 'navigation',
    },
  ];
  // 表單
  formGroup!: FormGroup;
  // 地圖篩選原始資料
  originalMapFilterSuggestions: DetailData[] = [];
  // 地圖篩選選項
  mapFilterSuggestions: DetailData[] = [];

  constructor(
    private homeApiService: HomeApiService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadInitData();
    this.initFormGroup();
    this.formSub();
  }

  // 載入資料並取得使用者位置
  loadInitData(): void {
    this.homeApiService.getData().subscribe((res) => {
      this.detailData = res;
      this.originalDetailData = res;
      this.originalMapFilterSuggestions = res.map((item) => {
        return {
          ...item,
          ar: `臺北市${item.ar}`,
          label: item.sna + '-' + item.ar,
        };
      });
      this.getUserPosition();
    });
  }

  // 表單初始化
  initFormGroup(): void {
    this.formGroup = this.formBuilder.nonNullable.group({
      filterStation: '',
      mapFilter: '',
    });
  }

  // 表單監聽
  formSub(): void {
    this.formGroup
      .get('filterStation')
      ?.valueChanges.pipe(debounceTime(300))
      .subscribe((keyword) => {
        this.detailData = this.originalDetailData.filter((item) => {
          return item.ar.includes(keyword) || item.sna.includes(keyword);
        });
      });
  }

  // 路由導至google導航
  doNavigationToStation(station: DetailData): void {
    let arKeyword = `${station.sna
      .replace('2.0', '微笑單車+2.0:')
      .replace('_', '')}`;

    window.location.href = `https://www.google.com.tw/maps/dir/${this.userPosition}/${arKeyword}/@${station.latitude},${station.longitude},19z/?entry=ttu`;
  }

  // 載入地圖
  initMap(data: DetailData[], userPosition: any): void {
    if (this.mapInitialized) {
      return;
    }

    this.map = L.map('map').setView(userPosition, 17);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    L.marker(userPosition, { icon: this.generateIcon('violet') })
      .addTo(this.map)
      .bindPopup('<p>目前位置</p>')
      .openPopup();

    let markers = L.markerClusterGroup().addTo(this.map);

    data.forEach((item: any) => {
      let mask;

      if (item.available_rent_bikes == 0) {
        mask = this.generateIcon('black');
      } else if (item.available_return_bikes == 0) {
        mask = this.generateIcon('grey');
      } else {
        mask = this.generateIcon('green');
      }
      let arKeyword = `${item.sna
        .replace('2.0', '微笑單車+2.0:')
        .replace('_', '')}`;

      markers.addLayer(
        L.marker([item.latitude, item.longitude], { icon: mask })
          .bindPopup(
            `<p>站名：${item.sna}</p><p>地址：${item.ar}</p><p>可租借車輛：${item.available_rent_bikes}</p><p>可歸還車位：${item.available_return_bikes}</p><a target="_blank" href="https://www.google.com.tw/maps/dir/${userPosition}/${arKeyword}/@${item.latitude},${item.longitude},19z/?entry=ttu">在Google Map上導航</a>`
          )
          .openPopup()
      );
    });

    this.map.addLayer(markers);
    // 完成初始後設定地圖已完成載入，避免重複渲染
    this.mapInitialized = true;
  }

  // 生成地圖Icon
  generateIcon(color: string): L.Icon {
    const baseIconConfig = {
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41] as L.PointTuple,
      iconAnchor: [12, 41] as L.PointTuple,
      popupAnchor: [1, -34] as L.PointTuple,
      shadowSize: [41, 41] as L.PointTuple,
    };

    let iconUrl: string;

    switch (color) {
      case 'green':
        iconUrl =
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
        break;
      case 'black':
        iconUrl =
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png';
        break;
      case 'violet':
        iconUrl =
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
        break;
      case 'grey':
        iconUrl =
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png';
        break;
      default:
        iconUrl =
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    }

    return L.icon({
      ...baseIconConfig,
      iconUrl,
    });
  }

  // 取得使用者位置
  getUserPosition(): void {
    navigator.geolocation.watchPosition(
      (position) => {
        this.userPosition = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        if (this.detailData.length > 0) {
          this.initMap(this.detailData, this.userPosition);
        }
      },
      (error) => {
        // 拒絕存取位置設定預設值
        this.userPosition = [25.03746, 121.564558];

        if (this.detailData.length > 0) {
          this.initMap(this.detailData, this.userPosition);
        }
      }
    );
  }

  // 表格搜尋事件
  doTableSearch(evt: AutoCompleteCompleteEvent): void {
    this.mapFilterSuggestions = this.originalMapFilterSuggestions.filter(
      (item) => item.ar.includes(evt.query) || item.sna.includes(evt.query)
    );
  }

  // 地圖搜尋事件
  doFocusStationOnMap(evt: AutoCompleteSelectEvent): void {
    const data = evt.value;
    if (this.map) {
      const popup = L.popup()
        .setLatLng([data.latitude, data.longitude])
        .setContent(
          `<p><p>站名：${data.sna}</p><p>地址：${data.ar}</p><p>可租借車輛：${data.available_rent_bikes}</p><p>可歸還車位：${data.available_return_bikes}</p><a target="_blank" href="https://www.google.com.tw/maps/dir/${this.userPosition}/${data.label}/@${data.latitude},${data.ar.longitude},19z/?entry=ttu">在Google Map上導航</a></p>`
        )
        .openOn(this.map);
      this.map
        .setView([data.latitude + 0.0002, data.longitude], 18)
        .openPopup(popup);
    }
  }
}
