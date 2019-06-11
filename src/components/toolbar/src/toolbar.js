import GlobalEvent from '../../../tools/event'
import DomTools from '../../../tools/dom'
import UtilTools from '../../../tools/utils'
import GlobalConfig from '../../../conf'
import XEUtils from 'xe-utils'

export default {
  name: 'VxeToolbar',
  props: {
    id: String,
    setting: [Boolean, Object],
    buttons: Array,
    size: String,
    data: Array,
    customs: Array
  },
  inject: {
    $grid: {
      default: null
    }
  },
  data () {
    return {
      tableCustoms: [],
      settingStore: {
        visible: false
      }
    }
  },
  computed: {
    $table () {
      let { $parent, data, customs } = this
      let { $children } = $parent
      let selfIndex = $children.indexOf(this)
      return $children.find((comp, index) => comp && comp.refreshColumn && index > selfIndex && (data ? comp.data === data : (customs ? comp.customs === customs : comp.$vnode.componentOptions.tag === 'vxe-table')))
    },
    vSize () {
      return this.size || this.$parent.size || this.$parent.vSize
    },
    isCustomStorage () {
      return this.setting && this.setting.storage
    }
  },
  created () {
    let { isCustomStorage, id, customs, setting } = this
    if (customs) {
      this.tableCustoms = customs
    }
    if (isCustomStorage && !id) {
      throw new Error('[vxe-table] Toolbar must have a unique primary id.')
    }
    if (setting) {
      this.$nextTick(() => this.loadStorage())
    }
    GlobalEvent.on(this, 'mousedown', this.handleGlobalMousedownEvent)
    GlobalEvent.on(this, 'blur', this.handleGlobalBlurEvent)
  },
  destroyed () {
    GlobalEvent.off(this, 'mousedown')
    GlobalEvent.off(this, 'blur')
  },
  render (h) {
    let { $slots, settingStore, setting, buttons = [], vSize, tableCustoms } = this
    let customBtnOns = {}
    let customWrapperOns = {}
    if (setting) {
      if (setting.trigger === 'manual') {
        // 手动触发
      } else if (setting.trigger === 'hover') {
        // hover 触发
        customBtnOns.mouseenter = this.handleMouseenterSettingEvent
        customBtnOns.mouseleave = this.handleMouseleaveSettingEvent
        customWrapperOns.mouseenter = this.handleWrapperMouseenterEvent
        customWrapperOns.mouseleave = this.handleWrapperMouseleaveEvent
      } else {
        // 点击触发
        customBtnOns.click = this.handleClickSettingEvent
      }
    }
    return h('div', {
      class: ['vxe-toolbar', {
        [`size--${vSize}`]: vSize
      }]
    }, [
      h('div', {
        class: 'vxe-button--wrapper'
      }, $slots.buttons ? $slots.buttons : buttons.map(item => {
        return h('vxe-button', {
          on: {
            click: evnt => this.btnEvent(item, evnt)
          }
        }, item.name)
      })),
      setting ? h('div', {
        class: ['vxe-custom--wrapper', {
          'is--active': settingStore.visible
        }],
        ref: 'customWrapper'
      }, [
        h('div', {
          class: 'vxe-custom--setting-btn',
          on: customBtnOns
        }, [
          h('i', {
            class: 'vxe-icon--menu'
          })
        ]),
        h('div', {
          class: 'vxe-custom--option-wrapper'
        }, [
          h('div', {
            class: 'vxe-custom--option',
            on: customWrapperOns
          }, tableCustoms.map(column => {
            return column.property && column.label ? h('vxe-checkbox', {
              props: {
                value: column.visible
              },
              on: {
                change: value => {
                  column.visible = value
                  if (setting && setting.immediate) {
                    this.updateSetting()
                  }
                }
              }
            }, column.label) : null
          }))
        ])
      ]) : null
    ])
  },
  methods: {
    openSetting () {
      this.settingStore.visible = true
    },
    closeSetting () {
      let { setting, settingStore } = this
      if (settingStore.visible) {
        settingStore.visible = false
        if (setting && !setting.immediate) {
          this.updateSetting()
        }
      }
    },
    loadStorage () {
      if (this.isCustomStorage) {
        let customStorageMap = this.getStorageMap()
        let customStorage = customStorageMap[this.id]
        if (customStorage) {
          this.updateCustoms(customStorage)
        } else {
          this.updateCustoms(this.tableCustoms)
        }
      } else {
        this.updateCustoms(this.tableCustoms)
      }
    },
    updateCustoms (customs) {
      let { $grid, $table } = this
      let comp = $grid || $table
      if (comp) {
        comp.reloadCustoms(customs).then(customs => {
          this.tableCustoms = customs
        })
      }
    },
    getStorageMap () {
      return XEUtils.toStringJSON(localStorage.getItem('VXE_TOOLBAR_CUSTOMS')) || {}
    },
    saveStorageMap () {
      let { id, tableCustoms, isCustomStorage } = this
      if (isCustomStorage) {
        let customStorageMap = this.getStorageMap()
        customStorageMap[id] = tableCustoms.filter(column => !column.visible).map(column => {
          return {
            prop: column.property,
            visible: column.visible
          }
        })
        localStorage.setItem('VXE_TOOLBAR_CUSTOMS', XEUtils.toJSONString(customStorageMap))
      }
    },
    updateSetting () {
      let { $grid, $table } = this
      if ($grid) {
        $grid.refreshColumn()
        this.saveStorageMap()
      } else {
        if ($table) {
          $table.refreshColumn()
          this.saveStorageMap()
        } else {
          console.error('[vxe-toolbar] Not found vxe-table.')
        }
      }
    },
    handleGlobalMousedownEvent (evnt) {
      if (!DomTools.getEventTargetNode(evnt, this.$refs.customWrapper).flag) {
        this.closeSetting()
      }
    },
    handleGlobalBlurEvent (evnt) {
      this.closeSetting()
    },
    handleClickSettingEvent (evnt) {
      let { settingStore } = this
      settingStore.visible = !settingStore.visible
    },
    handleMouseenterSettingEvent (evnt) {
      this.settingStore.activeBtn = true
      this.openSetting()
    },
    handleMouseleaveSettingEvent (evnt) {
      let { settingStore } = this
      settingStore.activeBtn = false
      setTimeout(() => {
        if (!settingStore.activeBtn && !settingStore.activeWrapper) {
          this.closeSetting()
        }
      }, 300)
    },
    handleWrapperMouseenterEvent (evnt) {
      this.settingStore.activeWrapper = true
      this.openSetting()
    },
    handleWrapperMouseleaveEvent (evnt) {
      let { settingStore } = this
      settingStore.activeWrapper = false
      setTimeout(() => {
        if (!settingStore.activeBtn && !settingStore.activeWrapper) {
          this.closeSetting()
        }
      }, 300)
    },
    btnEvent (item, evnt) {
      let { $grid } = this
      // 只对 gird 环境中有效
      if ($grid) {
        switch (item.code) {
          case 'insert':
            $grid.insert()
            break
          case 'insert_actived':
            $grid.insert().then(({ row }) => $grid.setActiveRow(row))
            break
          case 'delete_pending':
            $grid.triggerPendingEvent(evnt)
            break
          case 'delete_selection':
            $grid.commitProxy('delete')
            break
          case 'delete_rows':
            let selectRecords = $grid.getSelectRecords()
            if ($grid.isAlert) {
              if (selectRecords.length) {
                this.$XTool.confirm(GlobalConfig.i18n('vxe.grid.removeSelectRecord')).then(() => $grid.removeSelecteds()).catch(e => e)
              } else {
                this.$XTool.alert(GlobalConfig.i18n('vxe.grid.selectOneRecord')).catch(e => e)
              }
            } else {
              if (selectRecords.length) {
                $grid.removeSelecteds()
              }
            }
            break
          case 'save':
            $grid.commitProxy('save')
            break
          case 'reload':
            $grid.commitProxy('reload')
            break
          case 'export':
            $grid.exportCsv()
            break
        }
        UtilTools.emitEvent($grid, 'toolbar-button-click', [{ button: item, $grid }, evnt])
      }
    }
  }
}
